#!/usr/bin/env node
/**
 * Dev process wrapper — gives `pnpm dev` clean signal propagation and a
 * single recoverable process group when Ctrl+C, terminal close, or agent
 * cancellation occurs.
 *
 * Why this exists:
 *   `pnpm turbo run dev` spawns each workspace task in its own process
 *   group via pnpm. When the shell that started the dev session
 *   disappears (terminal closed, agent timed out, laptop sleep), the
 *   task groups get reparented to PID 1 and silently keep holding
 *   ports 3000/3001.
 *
 * Strategy:
 *   We can't reliably walk the parent-PID chain because children get
 *   reparented the moment their parent dies (PPID becomes 1, breaking
 *   the upward search before we can run it). Instead we track by
 *   CWD: every process whose current working directory is inside this
 *   repo is almost certainly part of the dev tree, regardless of who
 *   its parent is. CWD is preserved across reparenting.
 *
 *   On any terminating signal (SIGINT/SIGTERM/SIGHUP) or our own exit,
 *   we send SIGTERM to every tracked PID. SIGKILL escalation after a
 *   5-second grace period catches anything that ignored SIGTERM.
 *
 * Limitation (be honest):
 *   Pure Node can't observe its parent's death (that needs a Linux
 *   prctl(PR_SET_PDEATHSIG) call — what dumb-init does). If this wrapper
 *   is itself SIGKILL'd, the tree will be orphaned. Recover with
 *   `pnpm ports:clean`.
 */

import { spawn } from 'node:child_process';
import { readdirSync, readlinkSync } from 'node:fs';

const POLL_MS = 250;
const repoRoot = process.cwd();
const tracked = new Set();
let shuttingDown = false;

/**
 * Walk /proc and add every PID whose CWD is inside `repoRoot` to
 * `tracked`. Returns nothing — mutates the Set.
 */
function snapshotByCwd() {
  const names = readdirSync('/proc');
  for (const name of names) {
    if (!/^\d+$/.test(name)) continue;
    const pid = Number(name);
    if (tracked.has(pid)) continue;
    let cwd;
    try {
      cwd = readlinkSync(`/proc/${pid}/cwd`);
    } catch {
      continue; // process exited between readdir and readlink
    }
    if (cwd === repoRoot || cwd.startsWith(repoRoot + '/')) {
      tracked.add(pid);
    }
  }
}

const child = spawn('turbo', ['run', 'dev'], {
  stdio: 'inherit',
  detached: true,
});

const poll = setInterval(snapshotByCwd, POLL_MS);

function killTracked(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(poll);
  // Final snapshot so we don't miss anything that just appeared.
  snapshotByCwd();
  process.stderr.write(
    `[dev-runner] ${signal}: tracked ${tracked.size} PIDs\n`,
  );
  for (const pid of tracked) {
    try {
      process.kill(pid, signal);
    } catch {
      // already gone or not ours
    }
  }
  // Belt-and-braces: also signal turbo's own group.
  try {
    process.kill(-child.pid, signal);
  } catch {}
  // Escalate to SIGKILL after 5s for anything that ignored SIGTERM.
  setTimeout(() => {
    for (const pid of tracked) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  }, 5000);
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => killTracked(sig));
}

// Last-chance cleanup if we leave for any reason.
process.on('exit', () => killTracked('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    const sigNum = { SIGINT: 2, SIGTERM: 15, SIGHUP: 1 }[signal] ?? 1;
    process.exit(128 + sigNum);
  }
  process.exit(code ?? 0);
});
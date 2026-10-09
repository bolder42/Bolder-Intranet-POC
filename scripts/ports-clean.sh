#!/usr/bin/env bash
#
# ports-clean — kill anything in this repo still holding dev ports 3000/3001
# and any orphaned dev processes whose CWD is inside the repo.
#
# Recovery command for when `pnpm dev` was killed unceremoniously and left
# zombie listeners / detached tsx / next-server children. Safe to run any
# time: exits 0 whether or not it killed anything.
#
# Layer 2 of the orphan-process fix.

set -u

PORTS=(3000 3001)
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# 1) Kill anything listening on the dev ports. Prefer `fuser` (psmisc, common
#    on Debian/Ubuntu) and fall back to `lsof` (preinstalled on macOS and
#    most Fedora/Arch) so the recovery command is useful on minimal
#    installs that lack psmisc. SIGTERM is graceful; the rest of the
#    script's CWD walk (and the dev-runner's own escalation) handle
#    anything that ignores it.
for port in "${PORTS[@]}"; do
  if command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "${port}/tcp" 2>/dev/null || true
  elif command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
    for pid in $pids; do
      kill -TERM "$pid" 2>/dev/null || true
    done
  fi
  # If neither tool is available, the /proc CWD walk below still catches
  # any tsx/next/turbo processes spawned from inside this repo.
done

# 2) Walk any remaining node/tsx/next processes whose CWD is inside this
#    repo. Catches the orphans that lost their listeners but are still
#    hanging around (e.g. tsx watch that crashed its child). The patterns
#    match substrings of the full command line (which includes package
#    paths like `tsx@4.23.15/.../cli.mjs watch`), so use loose matches.
if [[ -d /proc ]]; then
  pids="$(pgrep -f 'tsx@|next-server|next dev|turbo run dev' 2>/dev/null || true)"
  for pid in $pids; do
    cwd="$(readlink "/proc/$pid/cwd" 2>/dev/null || true)"
    case "$cwd" in
      "$REPO_ROOT"/*|"$REPO_ROOT")
        kill -TERM "$pid" 2>/dev/null || true
        ;;
    esac
  done
fi

exit 0
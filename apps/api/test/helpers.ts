import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import type { Db, Invite, NewInvite } from "@bolder/db";
import type * as DbModule from "@bolder/db";
import type { Role } from "@bolder/shared";
import { generateInviteCode } from "../src/modules/invites/invite-code.js";

/** Minimal shape of the Hono app used by tests. */
export type TestApp = {
  request: (input: string, init?: RequestInit) => Promise<Response>;
};

export type TestHarness = {
  app: TestApp;
  db: Db;
  /** The `@bolder/db` module instance bound to the fresh test database. */
  mod: typeof DbModule;
  dir: string;
  cleanup: () => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_ADMIN_EMAIL = "seed-admin@bolder.local";

/**
 * Boots an isolated API instance backed by a fresh SQLite file with the
 * migrations applied. Safe to call before each test.
 */
export async function setupTestApp(): Promise<TestHarness> {
  const dir = mkdtempSync(join(tmpdir(), "bolder-api-"));
  const databaseUrl = join(dir, "test.db");

  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = "test-jwt-secret-please-change";

  vi.resetModules();

  const mod = await import("@bolder/db");
  mod.runMigrations(mod.getDb());

  const appModule = await import("../src/app.js");

  return {
    app: appModule.app as unknown as TestApp,
    db: mod.getDb(),
    mod,
    dir,
    cleanup: () => {
      // Windows cannot remove SQLite files while the connection is open.
      (mod.getDb() as Db & { $client: { close(): void } }).$client.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Invites have a `created_by` FK, so a creator row must exist before any
 * invite can be inserted. Tests start from an empty DB, so we lazily create
 * one inert seed admin and reuse it afterwards.
 */
function seedAdminId(h: TestHarness): number {
  const { users } = h.mod;
  const existing = h.db.select().from(users).get();
  if (existing) return existing.id;

  const admin = h.db
    .insert(users)
    .values({
      email: SEED_ADMIN_EMAIL,
      name: "Seed Admin",
      role: "admin",
      // Inert placeholder: this account is never logged into.
      passwordHash: "!seed-no-password",
    })
    .returning()
    .get();

  return admin.id;
}

/**
 * Inserts an invite row directly (never via HTTP, which would be circular).
 * Overrides let tests build expired / revoked / used / custom-role cases.
 */
export function seedInvite(
  h: TestHarness,
  overrides: Partial<NewInvite> = {},
): Invite {
  const { invites } = h.mod;
  return h.db
    .insert(invites)
    .values({
      code: generateInviteCode(),
      role: "dev",
      createdBy: seedAdminId(h),
      expiresAt: Date.now() + 7 * DAY_MS,
      ...overrides,
    })
    .returning()
    .get();
}

const JSON_HEADERS = { "content-type": "application/json" };

export async function registerUser(
  h: TestHarness,
  input: { email: string; password: string; name: string; role?: Role },
): Promise<{ token: string; user: { id: number; email: string; role: string } }> {
  const invite = seedInvite(h, { role: input.role ?? "dev" });
  const { email, password, name } = input;

  const res = await h.app.request("/api/auth/register", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password, name, inviteCode: invite.code }),
  });
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as {
    token: string;
    user: { id: number; email: string; role: string };
  };
}

export function authHeaders(token: string): Record<string, string> {
  return { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
}

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import type { Db } from "@bolder/db";
import type * as DbModule from "@bolder/db";

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
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const JSON_HEADERS = { "content-type": "application/json" };

export async function registerUser(
  app: TestApp,
  input: { email: string; password: string; name: string; role: string },
): Promise<{ token: string; user: { id: number; email: string; role: string } }> {
  const res = await app.request("/api/auth/register", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
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

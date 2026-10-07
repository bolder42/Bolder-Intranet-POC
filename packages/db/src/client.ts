import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/index.js";

/**
 * Database connection envelope. The whole application is backed by a SINGLE
 * SQLite database, partitioned by `project_id` (AGENTS.md §5).
 */
export type Db = BetterSQLite3Database<typeof schema>;

/**
 * Creates a new connection to the SQLite database.
 *
 * CRITICAL: every connection enables WAL journaling and, more importantly,
 * `PRAGMA foreign_keys = ON`. SQLite disables FK enforcement per-connection
 * by default, so this must be set on every `Database` construction.
 */
export function createDb(
  databaseUrl: string = process.env.DATABASE_URL ?? "./data/app.db",
): Db {
  if (databaseUrl !== ":memory:") {
    // Ensure the parent directory of a file-backed database exists.
    mkdirSync(dirname(databaseUrl), { recursive: true });
  }

  const sqlite = new Database(databaseUrl);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema }) as Db;
}

let instance: Db | undefined;

/**
 * Returns the process-wide singleton database connection.
 *
 * Repositories are the only layer allowed to call this (see the ESLint
 * `no-restricted-imports` rule for `apps/api/src/modules/**`).
 */
export function getDb(): Db {
  instance ??= createDb();
  return instance;
}

/**
 * Type-level `db` handle. Runtime access MUST go through `getDb()` so that
 * pragmas are always applied and the connection is shared.
 */
export const db: Db | undefined = undefined;

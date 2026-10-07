import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "./client.js";
import type { Db } from "./client.js";

const here = dirname(fileURLToPath(import.meta.url));

/** Default location of the generated migrations (`packages/db/drizzle`). */
export const DEFAULT_MIGRATIONS_FOLDER = resolve(here, "../drizzle");

/**
 * Applies the generated migrations to the given database.
 * Idempotent — safe to call from scripts and tests.
 */
export function runMigrations(
  db: Db = getDb(),
  migrationsFolder: string = DEFAULT_MIGRATIONS_FOLDER,
): void {
  migrate(db, { migrationsFolder });
}

// Allow `tsx src/migrate.ts` / `pnpm db:migrate` to run this file directly.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  runMigrations();
  console.warn("[db] migrations applied");
}

import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

/**
 * Load the monorepo root `.env` before reading process.env.DATABASE_URL.
 * drizzle-kit doesn't auto-load .env files, so without this `db:generate`
 * would silently fall back to the default `./data/app.db` even when the
 * user has set `DATABASE_URL` to a different path in the root `.env`.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../.env") });

/**
 * Drizzle Kit configuration for the single SQLite database.
 *
 * The database is a single file, partitioned by `project_id`
 * (see AGENTS.md §5). Migrations live in `./drizzle`.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/app.db",
  },
});

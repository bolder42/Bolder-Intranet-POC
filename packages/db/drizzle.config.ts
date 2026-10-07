import { defineConfig } from "drizzle-kit";

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

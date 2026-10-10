import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "@bolder/db";
import { getDb } from "./db/client.js";

/**
 * Load the monorepo root `.env` before reading process.env.DATABASE_URL.
 * Mirrors `apps/web/next.config.ts` — the same single source of truth.
 * The running api also goes through `env.ts`, which performs this same
 * load; this is here so `pnpm --filter @bolder/api db:migrate` works
 * even when invoked outside the dev process tree.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

runMigrations(getDb());
console.warn("[api] migrations applied");

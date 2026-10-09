import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

/**
 * Load the monorepo root `.env` into `process.env`.
 *
 * Why explicit: `dotenv/config` only looks at `process.cwd()/.env`, and
 * turbo runs the api task with cwd = `apps/api`. Without this, the api
 * would silently use the zod defaults below and never see the values
 * the user wrote in the root `.env` (the same file the frontend loads
 * via `apps/web/next.config.ts`).
 *
 * `override: false` (the default) means: an existing shell env wins,
 * and a real `apps/api/.env` would still take precedence if someone
 * creates one — same precedence rule as the frontend uses.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().default("./data/app.db"),
  JWT_SECRET: z.string().min(1).default("dev-insecure-secret-change-me"),
  API_PORT: z.coerce.number().int().positive().default(3001),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[api] invalid environment configuration", parsed.error.issues);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
export type Env = typeof env;

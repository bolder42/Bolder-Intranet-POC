import "dotenv/config";
import { z } from "zod";

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

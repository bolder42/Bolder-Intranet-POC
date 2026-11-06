import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { getDb, invites, runMigrations, users } from "@bolder/db";
import { RoleSchema, type Role } from "@bolder/shared";
import {
  generateInviteCode,
  normalizeInviteCode,
} from "../src/modules/invites/invite-code.js";

/**
 * Operator CLI for minting invitation codes. There is deliberately no admin
 * UI for invites yet, so this (plus the admin-only API) is how codes get
 * created.
 *
 * Usage:
 *   pnpm --filter @bolder/api invite
 *   pnpm --filter @bolder/api invite --role tech_lead --days 14
 *   pnpm --filter @bolder/api invite --role admin --created-by admin@bolder.local
 *
 * Flags:
 *   --role <dev|tech_lead|admin>  Role the redeemed account receives (default: dev)
 *   --days <1..365>               Invite lifetime in days (default: 7)
 *   --created-by <email>          Creator (default: first admin in the DB)
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function fail(message: string): never {
  console.error(`[invite] ${message}`);
  process.exit(1);
}

const roleInput = flag("role") ?? "dev";
const roleParsed = RoleSchema.safeParse(roleInput);
if (!roleParsed.success) fail(`invalid --role "${roleInput}" (expected dev|tech_lead|admin)`);
const role: Role = roleParsed.data;

const daysInput = flag("days") ?? "7";
const days = Number(daysInput);
if (!Number.isInteger(days) || days < 1 || days > 365) {
  fail(`invalid --days "${daysInput}" (expected an integer between 1 and 365)`);
}

const db = getDb();
runMigrations(db);

const creatorEmail = flag("created-by");
const creator = creatorEmail
  ? db.select().from(users).where(eq(users.email, creatorEmail)).get()
  : db.select().from(users).where(eq(users.role, "admin")).get();

if (!creator) {
  fail(
    creatorEmail
      ? `no user found with email "${creatorEmail}"`
      : "no admin user found — seed the database or pass --created-by <email>",
  );
}

let code: string | undefined;
for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !code; attempt += 1) {
  const candidate = normalizeInviteCode(generateInviteCode());
  const existing = db.select().from(invites).where(eq(invites.code, candidate)).get();
  if (!existing) code = candidate;
}
if (!code) fail("could not allocate a unique invitation code");

const expiresAt = Date.now() + days * DAY_MS;

const invite = db
  .insert(invites)
  .values({
    code,
    role,
    createdBy: creator.id,
    expiresAt,
  })
  .returning()
  .get();

console.warn(`[invite] code:     ${invite.code}`);
console.warn(`[invite] role:     ${invite.role}`);
console.warn(`[invite] created:  ${new Date(invite.createdAt).toISOString()}`);
console.warn(`[invite] expires:  ${new Date(invite.expiresAt).toISOString()}`);
console.warn(`[invite] register: http://localhost:3000/auth/register`);

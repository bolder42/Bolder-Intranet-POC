import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";

/**
 * Invites are global (not partitioned by project), exactly like `users`.
 * They are admin-managed, single-use, and gate account registration: the
 * redeeming user's global role is taken from the invite, never from the
 * client payload. The row is kept after redemption for audit purposes
 * (`used_at` / `used_by`), so deletion is not expected.
 */
export const invites = sqliteTable(
  "invites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(),
    role: text("role", { enum: ["dev", "tech_lead", "admin"] })
      .notNull()
      .default("dev"),
    createdBy: integer("created_by", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "number" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    expiresAt: integer("expires_at", { mode: "number" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "number" }),
    usedAt: integer("used_at", { mode: "number" }),
    usedBy: integer("used_by", { mode: "number" }).references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("invites_code_idx").on(table.code),
    index("invites_created_by_idx").on(table.createdBy),
  ],
);

export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";
import { users } from "./users.js";

/**
 * Membership joins a user to a project with a per-project role.
 * This is the source of truth for project-scoped authorization.
 */
export const projectMembers = sqliteTable(
  "project_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["lead", "member"] }).notNull().default("member"),
    joinedAt: integer("joined_at", { mode: "number" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("project_members_project_user_unique").on(
      table.projectId,
      table.userId,
    ),
    index("project_members_project_id_idx").on(table.projectId),
    index("project_members_user_id_idx").on(table.userId),
  ],
);

export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;

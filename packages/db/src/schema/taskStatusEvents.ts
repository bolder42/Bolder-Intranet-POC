import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";
import { tasks } from "./tasks.js";
import { users } from "./users.js";

/**
 * Immutable audit trail of task status changes (kanban column moves).
 *
 * Every status transition — including the creation event, whose `from_status`
 * is NULL — is recorded here so cycle time can be analysed later. Always
 * belongs to a project (`project_id` is NOT NULL) and disappears together with
 * its task or project via the cascading foreign keys.
 */
export const taskStatusEvents = sqliteTable(
  "task_status_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id", { mode: "number" })
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    projectId: integer("project_id", { mode: "number" })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fromStatus: text("from_status", { enum: ["backlog", "todo", "doing", "done"] }),
    toStatus: text("to_status", { enum: ["backlog", "todo", "doing", "done"] }).notNull(),
    changedById: integer("changed_by_id", { mode: "number" }).references(() => users.id, {
      onDelete: "set null",
    }),
    changedAt: integer("changed_at", { mode: "number" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("task_status_events_task_id_idx").on(table.taskId),
    index("task_status_events_project_id_idx").on(table.projectId),
  ],
);

export type TaskStatusEvent = typeof taskStatusEvents.$inferSelect;
export type NewTaskStatusEvent = typeof taskStatusEvents.$inferInsert;

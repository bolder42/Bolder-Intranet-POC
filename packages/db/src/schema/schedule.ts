import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";

/**
 * Schedule entries (milestones and deadlines) linked to a project.
 * Always belongs to a project — it is not standalone.
 */
export const scheduleItems = sqliteTable(
  "schedule_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["milestone", "deadline"] }).notNull(),
    dueAt: integer("due_at", { mode: "number" }).notNull(),
    description: text("description"),
  },
  (table) => [
    index("schedule_items_project_id_idx").on(table.projectId),
    index("schedule_items_due_at_idx").on(table.dueAt),
  ],
);

export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type NewScheduleItem = typeof scheduleItems.$inferInsert;

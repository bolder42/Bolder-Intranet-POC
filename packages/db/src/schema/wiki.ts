import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";
import { users } from "./users.js";

/**
 * Notion-like wiki page. Always belongs to a project — it is not standalone.
 */
export const wikiPages = sqliteTable(
  "wiki_pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id", { mode: "number" })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    authorId: integer("author_id", { mode: "number" }).references(
      () => users.id,
    ),
    updatedAt: integer("updated_at", { mode: "number" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("wiki_pages_project_id_idx").on(table.projectId)],
);

export type WikiPage = typeof wikiPages.$inferSelect;
export type NewWikiPage = typeof wikiPages.$inferInsert;

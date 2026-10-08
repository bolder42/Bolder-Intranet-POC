import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { projects } from "./schema/projects.js";
import { tasks } from "./schema/tasks.js";
import { scopedByProject } from "./scope.js";

const DDL = `
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_by INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  assignee_id INTEGER,
  due_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`;

function makeDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);
  const db = drizzle(sqlite);
  db.insert(projects).values([{ name: "P1" }, { name: "P2" }]).run();
  db.insert(tasks)
    .values([
      { projectId: 1, title: "a", status: "todo" },
      { projectId: 1, title: "b", status: "done" },
      { projectId: 2, title: "c", status: "todo" },
    ])
    .run();
  return db;
}

describe("scopedByProject", () => {
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    db = makeDb();
  });

  it("filters rows down to a single project partition", () => {
    const rows = db.select().from(tasks).where(scopedByProject(tasks, 1)).all();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.projectId === 1)).toBe(true);
  });

  it("combines extra clauses with the project partition (AND)", () => {
    const rows = db
      .select()
      .from(tasks)
      .where(scopedByProject(tasks, 1, eq(tasks.status, "todo")))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("a");
  });

  it("returns an SQL AND expression containing both predicates", () => {
    const { sql: text, params } = db
      .select()
      .from(tasks)
      .where(scopedByProject(tasks, 1, eq(tasks.status, "done")))
      .toSQL();

    expect(text).toContain(" and ");
    expect(text).toContain("project_id");
    expect(text).toContain("status");
    expect(params).toEqual([1, "done"]);
  });
});

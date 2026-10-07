import { and, eq, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/** Any table that carries a `project_id` column (wiki, tasks, schedule...). */
export type ProjectScopedTable = { projectId: SQLiteColumn };

/**
 * Builds the mandatory project partition clause.
 *
 * EVERY query against a table bearing a `project_id` MUST go through this
 * helper. It combines the project partition with any extra predicates:
 *
 *   scopedByProject(tasks, projectId, eq(tasks.status, "todo"))
 */
export function scopedByProject(
  table: ProjectScopedTable,
  projectId: number,
  ...extra: (SQL | undefined)[]
): SQL {
  const clauses: (SQL | undefined)[] = [
    eq(table.projectId, projectId),
    ...extra,
  ];
  // `and()` is typed as `SQL | undefined`; with at least one clause it is a
  // real SQL expression, so this cast is safe.
  return and(...clauses) as SQL;
}

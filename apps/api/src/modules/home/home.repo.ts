import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  ne,
  type SQL,
} from "drizzle-orm";
import {
  getDb,
  projectMembers,
  projects,
  scheduleItems,
  tasks,
  wikiPages,
} from "@bolder/db";
import type { AuthContext } from "@bolder/auth";

/**
 * READ-ONLY aggregations backing the Home projection.
 *
 * `null` means "no project filter" (admin sees everything). A non-null array
 * restricts the query to the projects the user belongs to.
 *
 * Note: `scopedByProject` expresses a single `project_id = ?` partition. The
 * Home projection aggregates over a *set* of visible projects, so it filters
 * with `inArray(project_id, ids)` instead. All queries here are read-only.
 */
export function visibleProjectIds(ctx: AuthContext): number[] | null {
  if (ctx.user.role === "admin") return null;
  return getDb()
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, ctx.user.id))
    .all()
    .map((row) => row.projectId);
}

function withProjectFilter(
  conditions: SQL[],
  ids: number[] | null,
  column: Parameters<typeof inArray>[0],
): SQL | undefined {
  if (ids === null) return and(...conditions);
  return and(...conditions, inArray(column, ids));
}

export const homeRepo = {
  countProjects(ids: number[] | null): number {
    if (ids !== null && ids.length === 0) return 0;
    const rows =
      ids === null
        ? getDb().select({ value: count() }).from(projects).all()
        : getDb()
            .select({ value: count() })
            .from(projects)
            .where(inArray(projects.id, ids))
            .all();
    return rows[0]?.value ?? 0;
  },

  countTasks(ids: number[] | null): number {
    if (ids !== null && ids.length === 0) return 0;
    const rows =
      ids === null
        ? getDb().select({ value: count() }).from(tasks).all()
        : getDb()
            .select({ value: count() })
            .from(tasks)
            .where(inArray(tasks.projectId, ids))
            .all();
    return rows[0]?.value ?? 0;
  },

  countOverdueTasks(ids: number[] | null, now: number): number {
    if (ids !== null && ids.length === 0) return 0;
    const rows = getDb()
      .select({ value: count() })
      .from(tasks)
      .where(
        withProjectFilter(
          [lt(tasks.dueAt, now), ne(tasks.status, "done")],
          ids,
          tasks.projectId,
        ),
      )
      .all();
    return rows[0]?.value ?? 0;
  },

  recentWiki(ids: number[] | null, limit: number) {
    if (ids !== null && ids.length === 0) return [];
    const query = getDb().select().from(wikiPages);
    return (ids === null
      ? query.orderBy(desc(wikiPages.updatedAt))
      : query
          .where(inArray(wikiPages.projectId, ids))
          .orderBy(desc(wikiPages.updatedAt))
    )
      .limit(limit)
      .all();
  },

  upcomingDeadlines(ids: number[] | null, now: number, limit: number) {
    if (ids !== null && ids.length === 0) return [];
    return getDb()
      .select()
      .from(scheduleItems)
      .where(
        withProjectFilter([gte(scheduleItems.dueAt, now)], ids, scheduleItems.projectId),
      )
      .orderBy(asc(scheduleItems.dueAt))
      .limit(limit)
      .all();
  },
};

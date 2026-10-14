import { asc, eq } from "drizzle-orm";
import { getDb, scheduleItems, scopedByProject, type NewScheduleItem } from "@bolder/db";

/**
 * Data-access for `schedule_items`.
 *
 * Every read/write is partitioned with `scopedByProject`, so an item can only
 * ever be reached through its owning project (AGENTS.md decision #1/#2).
 */
export const scheduleRepo = {
  listByProject(projectId: number) {
    return getDb()
      .select()
      .from(scheduleItems)
      .where(scopedByProject(scheduleItems, projectId))
      .orderBy(asc(scheduleItems.dueAt))
      .all();
  },

  byId(projectId: number, id: number) {
    return getDb()
      .select()
      .from(scheduleItems)
      .where(scopedByProject(scheduleItems, projectId, eq(scheduleItems.id, id)))
      .get();
  },

  create(input: NewScheduleItem) {
    return getDb().insert(scheduleItems).values(input).returning().get();
  },

  update(projectId: number, id: number, patch: Partial<NewScheduleItem>) {
    return getDb()
      .update(scheduleItems)
      .set(patch)
      .where(scopedByProject(scheduleItems, projectId, eq(scheduleItems.id, id)))
      .returning()
      .get();
  },

  delete(projectId: number, id: number) {
    return getDb()
      .delete(scheduleItems)
      .where(scopedByProject(scheduleItems, projectId, eq(scheduleItems.id, id)))
      .run();
  },
};

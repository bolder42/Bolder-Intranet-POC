import { getDb, scopedByProject, scheduleItems } from "@bolder/db";

export const scheduleRepo = {
  list(projectId: number) {
    return getDb()
      .select()
      .from(scheduleItems)
      .where(scopedByProject(scheduleItems, projectId))
      .all();
  },
};

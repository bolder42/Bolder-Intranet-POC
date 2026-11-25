import { getDb, scopedByProject, wikiPages } from "@bolder/db";

export const wikiRepo = {
  list(projectId: number) {
    return getDb().select().from(wikiPages).where(scopedByProject(wikiPages, projectId)).all();
  },
};

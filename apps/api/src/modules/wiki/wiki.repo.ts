import { eq } from "drizzle-orm";
import { getDb, scopedByProject, wikiPages, type NewWikiPage } from "@bolder/db";

export const wikiRepo = {
  list(projectId: number) {
    return getDb().select().from(wikiPages).where(scopedByProject(wikiPages, projectId)).all();
  },
  byId(projectId: number, pageId: number) {
    return getDb()
      .select()
      .from(wikiPages)
      .where(scopedByProject(wikiPages, projectId, eq(wikiPages.id, pageId)))
      .get();
  },
  byTitle(projectId: number, title: string) {
    return getDb()
      .select()
      .from(wikiPages)
      .where(scopedByProject(wikiPages, projectId, eq(wikiPages.title, title)))
      .get();
  },
  create(input: NewWikiPage) {
    return getDb().insert(wikiPages).values(input).returning().get();
  },
  update(projectId: number, pageId: number, input: Partial<NewWikiPage>) {
    return getDb()
      .update(wikiPages)
      .set({ ...input, updatedAt: Date.now() })
      .where(scopedByProject(wikiPages, projectId, eq(wikiPages.id, pageId)))
      .returning()
      .get();
  },
  delete(projectId: number, pageId: number) {
    return getDb()
      .delete(wikiPages)
      .where(scopedByProject(wikiPages, projectId, eq(wikiPages.id, pageId)))
      .run();
  },
};

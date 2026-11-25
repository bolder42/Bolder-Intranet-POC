import type { AuthContext } from "@bolder/auth";
import { requireProjectAccess } from "../projects/projects.service.js";
import { wikiRepo } from "./wiki.repo.js";

/** Read interface for projections; the Wiki HTTP CRUD remains a stub. */
export function listWikiPages(ctx: AuthContext, projectId: number) {
  requireProjectAccess(ctx, projectId);
  return wikiRepo.list(projectId);
}

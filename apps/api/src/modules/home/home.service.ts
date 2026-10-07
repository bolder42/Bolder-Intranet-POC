import type { AuthContext } from "@bolder/auth";
import { HomeSummarySchema, type HomeSummary } from "@bolder/shared";
import { homeRepo, visibleProjectIds } from "./home.repo.js";

const RECENT_WIKI_LIMIT = 5;
const UPCOMING_DEADLINE_LIMIT = 5;

/**
 * Assembles the read-only Home projection. This module NEVER writes.
 */
export function getHomeSummary(ctx: AuthContext): HomeSummary {
  const ids = visibleProjectIds(ctx);
  const now = Date.now();

  return HomeSummarySchema.parse({
    projectCount: homeRepo.countProjects(ids),
    taskCount: homeRepo.countTasks(ids),
    overdueTaskCount: homeRepo.countOverdueTasks(ids, now),
    recentWiki: homeRepo.recentWiki(ids, RECENT_WIKI_LIMIT),
    upcomingDeadlines: homeRepo.upcomingDeadlines(
      ids,
      now,
      UPCOMING_DEADLINE_LIMIT,
    ),
  });
}

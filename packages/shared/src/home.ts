import { z } from "zod";
import { ScheduleItemSchema } from "./schedule.js";
import { WikiPageSchema } from "./wiki.js";

/**
 * Read-only projection composed from Projects, Tasks, Schedule and Wiki.
 * The Home module MUST NEVER write to the database.
 */
export const HomeSummarySchema = z.object({
  projectCount: z.number(),
  taskCount: z.number(),
  overdueTaskCount: z.number(),
  recentWiki: z.array(WikiPageSchema),
  upcomingDeadlines: z.array(ScheduleItemSchema),
});
export type HomeSummary = z.infer<typeof HomeSummarySchema>;

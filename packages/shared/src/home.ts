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

export const ProjectPerformanceSchema = z.object({
  id: z.number(),
  name: z.string(),
  deadline: z.number().nullable(),
  status: z.enum(["not_started", "in_progress", "at_risk", "completed"]),
  total: z.number(),
  done: z.number(),
  doing: z.number(),
  overdue: z.number(),
  unassigned: z.number(),
  progress: z.number(),
  members: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      assigned: z.number(),
      done: z.number(),
      overdue: z.number(),
    }),
  ),
});
export const HomePerformanceSchema = z.object({ projects: z.array(ProjectPerformanceSchema) });
export type HomePerformance = z.infer<typeof HomePerformanceSchema>;

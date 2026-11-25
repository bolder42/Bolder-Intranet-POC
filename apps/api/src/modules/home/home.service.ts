import { requireGlobalRole, type AuthContext } from "@bolder/auth";
import { HomeSummarySchema, type HomeSummary } from "@bolder/shared";
import { listWikiPages } from "../wiki/wiki.service.js";
import { listScheduleItems } from "../schedule/schedule.service.js";
import { listProjects } from "../projects/projects.service.js";
import { listTasks } from "../tasks/tasks.service.js";
import { HomePerformanceSchema, type HomePerformance } from "@bolder/shared";

const RECENT_WIKI_LIMIT = 5;
const UPCOMING_DEADLINE_LIMIT = 5;

/**
 * Assembles the read-only Home projection. This module NEVER writes.
 */
export function getHomeSummary(ctx: AuthContext): HomeSummary {
  const projects = listProjects(ctx);
  const tasks = projects.flatMap((project) => listTasks(ctx, project.id));
  const now = Date.now();

  return HomeSummarySchema.parse({
    projectCount: projects.length,
    taskCount: tasks.length,
    overdueTaskCount: tasks.filter(
      (task) => task.status !== "done" && task.dueAt !== null && task.dueAt < now,
    ).length,
    recentWiki: projects
      .flatMap((project) => listWikiPages(ctx, project.id))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, RECENT_WIKI_LIMIT),
    upcomingDeadlines: projects
      .flatMap((project) => listScheduleItems(ctx, project.id))
      .filter((item) => item.dueAt >= now)
      .sort((a, b) => a.dueAt - b.dueAt)
      .slice(0, UPCOMING_DEADLINE_LIMIT),
  });
}

/** Leadership metrics read exclusively through the owning modules' services. */
export function getHomePerformance(ctx: AuthContext): HomePerformance {
  requireGlobalRole(ctx, ["tech_lead", "admin"]);
  const now = Date.now();
  return HomePerformanceSchema.parse({
    projects: listProjects(ctx).map((project) => {
      const tasks = listTasks(ctx, project.id);
      const overdue = (task: (typeof tasks)[number]) =>
        task.status !== "done" && task.dueAt !== null && task.dueAt < now;
      const done = tasks.filter((task) => task.status === "done").length;
      const late = tasks.filter(overdue).length;
      const completed = tasks.length > 0 && done === tasks.length;
      const status = completed
        ? "completed"
        : late > 0 || (project.deadline !== null && project.deadline < now)
          ? "at_risk"
          : tasks.some((task) => task.status === "doing" || task.status === "done")
            ? "in_progress"
            : "not_started";
      return {
        id: project.id,
        name: project.name,
        deadline: project.deadline,
        status,
        total: tasks.length,
        done,
        doing: tasks.filter((task) => task.status === "doing").length,
        overdue: late,
        unassigned: tasks.filter((task) => task.assigneeId === null && task.status !== "done")
          .length,
        progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
        members: project.members.map((member) => {
          const assigned = tasks.filter((task) => task.assigneeId === member.userId);
          return {
            id: member.userId,
            name: member.user.name,
            assigned: assigned.length,
            done: assigned.filter((task) => task.status === "done").length,
            overdue: assigned.filter(overdue).length,
          };
        }),
      };
    }),
  });
}

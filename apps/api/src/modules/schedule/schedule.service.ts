import type { AuthContext } from "@bolder/auth";
import { requireProjectAccess } from "../projects/projects.service.js";
import { scheduleRepo } from "./schedule.repo.js";

/** Read interface for projections; Schedule HTTP CRUD remains a stub. */
export function listScheduleItems(ctx: AuthContext, projectId: number) {
  requireProjectAccess(ctx, projectId);
  return scheduleRepo.list(projectId);
}

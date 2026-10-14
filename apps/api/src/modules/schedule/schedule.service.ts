import { requireGlobalRole, requireProjectMember } from "@bolder/auth";
import type { AuthContext } from "@bolder/auth";
import {
  ApiError,
  ErrorCode,
  type CreateScheduleItemInput,
  type UpdateScheduleItemInput,
} from "@bolder/shared";
import { scheduleRepo } from "./schedule.repo.js";

/**
 * Schedule business logic (MODULES.md).
 *
 * - Reading requires membership of the project (Admin always passes).
 * - Writing requires the global Tech Lead or Admin role.
 */
function ensureItem(projectId: number, itemId: number) {
  const item = scheduleRepo.byId(projectId, itemId);
  if (!item) {
    throw new ApiError(ErrorCode.NOT_FOUND, "Schedule item not found.");
  }
  return item;
}

export function listItems(ctx: AuthContext, projectId: number) {
  requireProjectMember(ctx, projectId);
  return scheduleRepo.listByProject(projectId);
}

export function createItem(ctx: AuthContext, projectId: number, input: CreateScheduleItemInput) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);
  return scheduleRepo.create({
    projectId,
    title: input.title,
    kind: input.kind,
    dueAt: input.dueAt,
    description: input.description ?? null,
  });
}

export function updateItem(
  ctx: AuthContext,
  projectId: number,
  itemId: number,
  input: UpdateScheduleItemInput,
) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);
  ensureItem(projectId, itemId);

  const patch: {
    title?: string;
    kind?: "milestone" | "deadline";
    dueAt?: number;
    description?: string | null;
  } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.dueAt !== undefined) patch.dueAt = input.dueAt;
  if (input.description !== undefined) patch.description = input.description ?? null;

  return scheduleRepo.update(projectId, itemId, patch);
}

export function deleteItem(ctx: AuthContext, projectId: number, itemId: number) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);
  ensureItem(projectId, itemId);
  scheduleRepo.delete(projectId, itemId);
}

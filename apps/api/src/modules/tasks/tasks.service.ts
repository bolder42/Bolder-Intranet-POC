import { requireProjectMember } from "@bolder/auth";
import type { AuthContext } from "@bolder/auth";
import {
  ApiError,
  ErrorCode,
  type CreateTaskInput,
  type MoveTaskInput,
  type TaskEvent,
  type TaskListItem,
  type UpdateTaskInput,
} from "@bolder/shared";
import { getProject } from "../projects/projects.service.js";
import type { TaskUpdatePatch } from "./tasks.repo.js";
import { tasksRepo } from "./tasks.repo.js";

/**
 * Tasks always belong to a project (AGENTS.md §5). The existence check goes
 * through the Projects service public interface — never through the tables.
 */
function ensureProject(projectId: number): void {
  getProject(projectId);
}

function ensureTask(projectId: number, taskId: number): TaskListItem {
  const task = tasksRepo.byId(projectId, taskId);
  if (!task) throw new ApiError(ErrorCode.NOT_FOUND, "Task not found.");
  return task;
}

/** An assignee, when present, MUST be a member of the very same project. */
function ensureAssignee(projectId: number, assigneeId: number | null): number | null {
  if (assigneeId === null) return null;
  if (!tasksRepo.findMember(projectId, assigneeId)) {
    // Contract: a non-member assignee is a 400 VALIDATION, not the default 422.
    throw new ApiError(ErrorCode.VALIDATION, "Assignee must be a member of this project.", 400);
  }
  return assigneeId;
}

/** Tasks of one project, oldest first. Members only (Admins override). */
export function listTasks(ctx: AuthContext, projectId: number): TaskListItem[] {
  ensureProject(projectId);
  requireProjectMember(ctx, projectId);
  return tasksRepo.list(projectId);
}

/**
 * Creates a task and ALWAYS records its creation event, so the audit trail
 * starts at `fromStatus: null` even when the task is born as `todo`.
 */
export function createTask(
  ctx: AuthContext,
  projectId: number,
  input: CreateTaskInput,
): TaskListItem {
  ensureProject(projectId);
  requireProjectMember(ctx, projectId);
  const assigneeId = ensureAssignee(projectId, input.assigneeId ?? null);
  return tasksRepo.create(
    projectId,
    {
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      assigneeId,
      dueAt: input.dueAt ?? null,
    },
    ctx.user.id,
  );
}

/**
 * Partial update of the editable fields. Status is NOT editable here — it
 * moves through `moveTask` so every transition is recorded.
 */
export function updateTask(
  ctx: AuthContext,
  projectId: number,
  taskId: number,
  input: UpdateTaskInput,
): TaskListItem {
  ensureProject(projectId);
  ensureTask(projectId, taskId);
  requireProjectMember(ctx, projectId);

  const patch: TaskUpdatePatch = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.assigneeId !== undefined)
    patch.assigneeId = ensureAssignee(projectId, input.assigneeId);
  if (input.dueAt !== undefined) patch.dueAt = input.dueAt;

  return tasksRepo.update(projectId, taskId, patch);
}

/** Moves a card between kanban columns and records the transition. */
export function moveTask(
  ctx: AuthContext,
  projectId: number,
  taskId: number,
  input: MoveTaskInput,
): TaskListItem {
  ensureProject(projectId);
  ensureTask(projectId, taskId);
  requireProjectMember(ctx, projectId);
  return tasksRepo.move(projectId, taskId, input.status, ctx.user.id);
}

export function deleteTask(ctx: AuthContext, projectId: number, taskId: number): void {
  ensureProject(projectId);
  ensureTask(projectId, taskId);
  requireProjectMember(ctx, projectId);
  // The status events go away with the task (ON DELETE CASCADE).
  tasksRepo.delete(projectId, taskId);
}

/** Status history of one task, oldest transition first. */
export function listTaskEvents(ctx: AuthContext, projectId: number, taskId: number): TaskEvent[] {
  ensureProject(projectId);
  ensureTask(projectId, taskId);
  requireProjectMember(ctx, projectId);
  return tasksRepo.listEvents(projectId, taskId);
}

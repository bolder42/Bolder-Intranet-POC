import type { TaskStatus } from "@bolder/shared";

import {
  createTaskAction,
  deleteTaskAction,
  listTasksAction,
  moveTaskStatusAction,
  updateTaskAction,
} from "./tasks-actions";
import type { CreateTaskPayload, TaskListItem, UpdateTaskPayload } from "./task-types";

/**
 * Client-side facade over the Tasks server actions. Callers (the kanban
 * board) keep the same function signatures and optimistic-update semantics
 * as a direct RPC, but the actual HTTP + Bearer auth happens on the server
 * (see `tasks-actions.ts` — the JWT only exists inside the encrypted
 * Auth.js cookie, and `@/lib/api` must never enter the client bundle).
 *
 * Tests mock this module, so they do not depend on the backend.
 */

export async function listTasks(projectId: string): Promise<TaskListItem[]> {
  return listTasksAction(projectId);
}

export async function createTask(
  projectId: string,
  payload: CreateTaskPayload,
): Promise<TaskListItem> {
  return createTaskAction(projectId, payload);
}

export async function updateTask(
  projectId: string,
  taskId: number,
  payload: UpdateTaskPayload,
): Promise<TaskListItem> {
  return updateTaskAction(projectId, taskId, payload);
}

export async function moveTaskStatus(
  projectId: string,
  taskId: number,
  status: TaskStatus,
): Promise<TaskListItem> {
  return moveTaskStatusAction(projectId, taskId, status);
}

export async function deleteTask(projectId: string, taskId: number): Promise<void> {
  return deleteTaskAction(projectId, taskId);
}

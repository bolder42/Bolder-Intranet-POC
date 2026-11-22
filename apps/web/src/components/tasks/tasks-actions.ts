"use server";

import { revalidatePath } from "next/cache";
import type { TaskStatus } from "@bolder/shared";

import { api, getAuthHeaders } from "@/lib/api";

import type { CreateTaskPayload, TaskListItem, UpdateTaskPayload } from "./task-types";

/**
 * Server actions for the Tasks board.
 *
 * The kanban board is a client component, but it must NOT call the backend
 * directly: the API authenticates with a Bearer JWT that lives inside the
 * encrypted Auth.js session cookie, which only the server can read (see
 * `getAuthHeaders` in `@/lib/api`). Importing `@/lib/api` from client code
 * would also drag `@/auth` into the browser bundle, where `AUTH_SECRET`
 * does not exist and `auth.config.ts` throws at module load.
 *
 * Same pattern as `app/app/projects/actions.ts` (saveProject /
 * deleteProjectAction): mutations cross the boundary as server actions.
 * The client keeps its optimistic UI in `tasks-api.ts`, which wraps these.
 */

function taskIdParam(taskId: number): string {
  return String(taskId);
}

function boardPath(projectId: string): string {
  return `/app/projects/${projectId}/tasks`;
}

export async function listTasksAction(projectId: string): Promise<TaskListItem[]> {
  const headers = await getAuthHeaders();
  const response = await api.api.tasks[":projectId"].$get({ param: { projectId } }, { headers });
  if (!response.ok) throw new Error("Could not load tasks. Please try again.");
  const data = (await response.json()) as { tasks: TaskListItem[] };
  return data.tasks;
}

export async function createTaskAction(
  projectId: string,
  payload: CreateTaskPayload,
): Promise<TaskListItem> {
  const headers = await getAuthHeaders();
  const response = await api.api.tasks[":projectId"].$post(
    { param: { projectId }, json: payload },
    { headers },
  );
  if (!response.ok) throw new Error("Could not create the task. Please try again.");
  const data = (await response.json()) as { task: TaskListItem };
  revalidatePath(boardPath(projectId));
  return data.task;
}

export async function updateTaskAction(
  projectId: string,
  taskId: number,
  payload: UpdateTaskPayload,
): Promise<TaskListItem> {
  const headers = await getAuthHeaders();
  const response = await api.api.tasks[":projectId"][":taskId"].$patch(
    { param: { projectId, taskId: taskIdParam(taskId) }, json: payload },
    { headers },
  );
  if (!response.ok) throw new Error("Could not save the task. Please try again.");
  const data = (await response.json()) as { task: TaskListItem };
  revalidatePath(boardPath(projectId));
  return data.task;
}

export async function moveTaskStatusAction(
  projectId: string,
  taskId: number,
  status: TaskStatus,
): Promise<TaskListItem> {
  const headers = await getAuthHeaders();
  const response = await api.api.tasks[":projectId"][":taskId"].status.$patch(
    { param: { projectId, taskId: taskIdParam(taskId) }, json: { status } },
    { headers },
  );
  if (!response.ok) throw new Error("Could not move the task. Please try again.");
  const data = (await response.json()) as { task: TaskListItem };
  revalidatePath(boardPath(projectId));
  return data.task;
}

export async function deleteTaskAction(projectId: string, taskId: number): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await api.api.tasks[":projectId"][":taskId"].$delete(
    { param: { projectId, taskId: taskIdParam(taskId) } },
    { headers },
  );
  if (!response.ok) throw new Error("Could not delete the task. Please try again.");
  revalidatePath(boardPath(projectId));
}

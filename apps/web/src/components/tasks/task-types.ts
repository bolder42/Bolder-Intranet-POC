import type { TaskPriority, TaskStatus, UserPublic } from "@bolder/shared";

/**
 * A single task as returned by the Tasks API list/detail shapes.
 * Mirrors the FROZEN contract: `GET /api/tasks/:projectId` responds with
 * `{ tasks: TaskListItem[] }`.
 */
export interface TaskAssignee {
  id: number;
  name: string;
  email: string;
  role: UserPublic["role"];
}

export interface TaskListItem {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  dueAt: number | null;
  createdAt: number;
  assignee: TaskAssignee | null;
}

/** Body of POST /api/tasks/:projectId (status optional, defaults to todo). */
export interface CreateTaskPayload {
  title: string;
  description?: string | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  assigneeId?: number | null | undefined;
  dueAt?: number | null | undefined;
}

/** Body of PATCH /api/tasks/:projectId/:taskId — status moves are separate. */
export interface UpdateTaskPayload {
  title?: string | undefined;
  description?: string | null | undefined;
  priority?: TaskPriority | undefined;
  assigneeId?: number | null | undefined;
  dueAt?: number | null | undefined;
}

/**
 * Assignee candidates come from the existing Projects members endpoint:
 * `GET /api/projects/:projectId/members` responds with
 * `{ members: [{ user: UserPublic, ... }] }`. The board only needs the user.
 */
export interface BoardMember {
  user: UserPublic;
}

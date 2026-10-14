import { z } from "zod";
import { UserPublicSchema } from "./auth.js";

/** Kanban board stages, in display order: backlog → todo → doing → done. */
export const TaskStatusSchema = z.enum(["backlog", "todo", "doing", "done"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/** Per-task priority flag (default: medium). */
export const TaskPrioritySchema = z.enum(["low", "medium", "high"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigneeId: z.number().nullable(),
  dueAt: z.number().nullable(),
  createdAt: z.number(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema.optional().default("todo"),
  priority: TaskPrioritySchema.optional().default("medium"),
  assigneeId: z.number().nullable().optional(),
  dueAt: z.number().nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

/**
 * Partial update of a task. Status changes are NOT expressible here — moving a
 * card between kanban columns goes through `MoveTaskSchema` so that the
 * transition is recorded in `task_status_events`.
 */
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: TaskPrioritySchema.optional(),
  assigneeId: z.number().nullable().optional(),
  dueAt: z.number().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

/** Single status transition (kanban move). */
export const MoveTaskSchema = z.object({
  status: TaskStatusSchema,
});
export type MoveTaskInput = z.infer<typeof MoveTaskSchema>;

/** A task as returned by the list / create / update / move endpoints. */
export const TaskListItemSchema = TaskSchema.extend({
  assignee: UserPublicSchema.nullable(),
});
export type TaskListItem = z.infer<typeof TaskListItemSchema>;

/** One recorded status transition, used for cycle-time analysis. */
export const TaskEventSchema = z.object({
  id: z.number(),
  taskId: z.number(),
  projectId: z.number(),
  fromStatus: TaskStatusSchema.nullable(),
  toStatus: TaskStatusSchema,
  changedById: z.number().nullable(),
  changedAt: z.number(),
});
export type TaskEvent = z.infer<typeof TaskEventSchema>;

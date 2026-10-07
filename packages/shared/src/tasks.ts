import { z } from "zod";

/** Kanban is intentionally minimal for the POC: To Do / Doing / Done. */
export const TaskStatusSchema = z.enum(["todo", "doing", "done"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  assigneeId: z.number().nullable(),
  dueAt: z.number().nullable(),
  createdAt: z.number(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema.optional().default("todo"),
  assigneeId: z.number().nullable().optional(),
  dueAt: z.number().nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

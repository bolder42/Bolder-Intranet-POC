import { z } from "zod";

export const ScheduleKindSchema = z.enum(["milestone", "deadline"]);
export type ScheduleKind = z.infer<typeof ScheduleKindSchema>;

export const ScheduleItemSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  title: z.string(),
  kind: ScheduleKindSchema,
  dueAt: z.number(),
  description: z.string().nullable(),
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

export const CreateScheduleItemSchema = z.object({
  title: z.string().min(1),
  kind: ScheduleKindSchema,
  dueAt: z.number(),
  description: z.string().optional(),
});
export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemSchema>;

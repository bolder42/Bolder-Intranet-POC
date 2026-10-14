import { z } from "zod";

/** Schedule entries are either milestones or hard deadlines. */
export const ScheduleKindSchema = z.enum(["milestone", "deadline"]);
export type ScheduleKind = z.infer<typeof ScheduleKindSchema>;

export const ScheduleItemSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  title: z.string(),
  kind: ScheduleKindSchema,
  /** Unix timestamp in milliseconds (UTC midnight for calendar dates). */
  dueAt: z.number(),
  description: z.string().nullable(),
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

export const CreateScheduleItemSchema = z.object({
  title: z.string().trim().min(1),
  kind: ScheduleKindSchema,
  dueAt: z.number().int().nonnegative(),
  description: z.string().optional(),
});
export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemSchema>;

export const UpdateScheduleItemSchema = z.object({
  title: z.string().trim().min(1).optional(),
  kind: ScheduleKindSchema.optional(),
  dueAt: z.number().int().nonnegative().optional(),
  description: z.string().nullable().optional(),
});
export type UpdateScheduleItemInput = z.infer<typeof UpdateScheduleItemSchema>;

export const ScheduleListSchema = z.object({ items: z.array(ScheduleItemSchema) });
export type ScheduleList = z.infer<typeof ScheduleListSchema>;

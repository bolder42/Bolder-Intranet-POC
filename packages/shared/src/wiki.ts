import { z } from "zod";

export const WikiPageSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  title: z.string(),
  content: z.string(),
  authorId: z.number().nullable(),
  updatedAt: z.number(),
});
export type WikiPage = z.infer<typeof WikiPageSchema>;

export const CreateWikiSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(""),
});
export type CreateWikiInput = z.infer<typeof CreateWikiSchema>;

export const UpdateWikiSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});
export type UpdateWikiInput = z.infer<typeof UpdateWikiSchema>;

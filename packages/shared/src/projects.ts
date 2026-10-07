import { z } from "zod";

export const ProjectMemberRoleSchema = z.enum(["lead", "member"]);
export type ProjectMemberRole = z.infer<typeof ProjectMemberRoleSchema>;

export const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  createdBy: z.number().nullable(),
  createdAt: z.number(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  memberIds: z.array(z.number()).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const ProjectMemberSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  userId: z.number(),
  role: ProjectMemberRoleSchema,
  joinedAt: z.number(),
});
export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

export const AddProjectMemberSchema = z.object({
  userId: z.number().int().positive(),
  role: ProjectMemberRoleSchema.optional().default("member"),
});
export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;

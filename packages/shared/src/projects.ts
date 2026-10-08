import { z } from "zod";
import { UserPublicSchema } from "./auth.js";

export const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  createdBy: z.number().nullable(),
  createdAt: z.number(),
  deadline: z.number().int().nonnegative().nullable().optional().default(null),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  deadline: z.number().int().nonnegative().nullable().optional(),
  memberIds: z.array(z.number().int().positive()).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  deadline: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const ProjectMemberSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  userId: z.number(),
  joinedAt: z.number(),
});
export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

export const AddProjectMemberSchema = z.object({
  userId: z.number().int().positive(),
});
export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;
export const ProjectParticipantSchema = ProjectMemberSchema.extend({ user: UserPublicSchema });
export const ProjectDetailSchema = z.object({
  project: ProjectSchema,
  members: z.array(ProjectParticipantSchema),
});
export const ProjectListSchema = z.object({
  projects: z.array(ProjectSchema.extend({ members: z.array(ProjectParticipantSchema) })),
});
export const ProjectCandidatesSchema = z.object({ users: z.array(UserPublicSchema) });
export type ProjectParticipant = z.infer<typeof ProjectParticipantSchema>;

import { requireGlobalRole, requireProjectLead } from "@bolder/auth";
import type { AuthContext } from "@bolder/auth";
import {
  ApiError,
  ErrorCode,
  type AddProjectMemberInput,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@bolder/shared";
import { projectsRepo } from "./projects.repo.js";

function ensureProject(projectId: number) {
  const project = projectsRepo.byId(projectId);
  if (!project) {
    throw new ApiError(ErrorCode.NOT_FOUND, "Project not found.");
  }
  return project;
}

/** Admins see every project; everyone else sees only their projects. */
export function listProjects(ctx: AuthContext) {
  if (ctx.user.role === "admin") return projectsRepo.listAll();
  return projectsRepo.listForUser(ctx.user.id);
}

export function getProject(projectId: number) {
  return ensureProject(projectId);
}

/** Creating a project requires a global Tech Lead or Admin role. */
export function createProject(ctx: AuthContext, input: CreateProjectInput) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);

  const project = projectsRepo.create({
    name: input.name,
    description: input.description ?? null,
    createdBy: ctx.user.id,
  });

  // The creator becomes the project lead.
  projectsRepo.addMember({
    projectId: project.id,
    userId: ctx.user.id,
    role: "lead",
  });

  for (const userId of input.memberIds ?? []) {
    if (userId === ctx.user.id) continue;
    projectsRepo.addMember({ projectId: project.id, userId, role: "member" });
  }

  return project;
}

/** Updating a project requires the project lead (or a global admin). */
export function updateProject(
  ctx: AuthContext,
  projectId: number,
  input: UpdateProjectInput,
) {
  requireProjectLead(ctx, projectId);
  ensureProject(projectId);

  const patch: { name?: string; description?: string | null } = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;

  return projectsRepo.update(projectId, patch);
}

/** Deleting a project is admin-only. */
export function deleteProject(ctx: AuthContext, projectId: number) {
  requireGlobalRole(ctx, ["admin"]);
  ensureProject(projectId);
  projectsRepo.delete(projectId);
}

export function listMembers(projectId: number) {
  ensureProject(projectId);
  return projectsRepo.listMembers(projectId);
}

/** Adding a member requires the project lead (or a global admin). */
export function addMember(
  ctx: AuthContext,
  projectId: number,
  input: AddProjectMemberInput,
) {
  requireProjectLead(ctx, projectId);
  ensureProject(projectId);

  if (projectsRepo.findMembership(projectId, input.userId)) {
    throw new ApiError(ErrorCode.CONFLICT, "User is already a project member.");
  }

  return projectsRepo.addMember({
    projectId,
    userId: input.userId,
    role: input.role,
  });
}

/** Removing a member requires the project lead (or a global admin). */
export function removeMember(
  ctx: AuthContext,
  projectId: number,
  userId: number,
) {
  requireProjectLead(ctx, projectId);
  ensureProject(projectId);
  projectsRepo.removeMember(projectId, userId);
}

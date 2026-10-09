import { requireGlobalRole, requireProjectMember } from "@bolder/auth";
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
  const projects =
    ctx.user.role === "admin" ? projectsRepo.listAll() : projectsRepo.listForUser(ctx.user.id);
  return projects.map((project) => ({ ...project, members: projectsRepo.listMembers(project.id) }));
}

export function getProject(projectId: number) {
  return ensureProject(projectId);
}

/** Creating a project requires a global Tech Lead or Admin role. */
export function createProject(ctx: AuthContext, input: CreateProjectInput) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);

  const memberIds = [...new Set([ctx.user.id, ...(input.memberIds ?? [])])];
  const available = new Set(projectsRepo.candidates().map((user) => user.id));
  if (memberIds.some((id) => !available.has(id)))
    throw new ApiError(ErrorCode.VALIDATION, "Unknown participant.");
  const project = projectsRepo.createWithMembers(
    {
      name: input.name,
      description: input.description ?? null,
      createdBy: ctx.user.id,
      deadline: input.deadline ?? null,
    },
    memberIds,
  );

  return project;
}

/** Updating a project requires a global Tech Lead or Admin role. */
export function updateProject(ctx: AuthContext, projectId: number, input: UpdateProjectInput) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);
  ensureProject(projectId);

  const patch: { name?: string; description?: string | null; deadline?: number | null } = {};
  if (input.deadline !== undefined) patch.deadline = input.deadline;
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;

  return projectsRepo.update(projectId, patch);
}

/** Admins may delete any project; Tech Leads must belong to the project. */
export function deleteProject(ctx: AuthContext, projectId: number) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);
  ensureProject(projectId);
  requireProjectMember(ctx, projectId);
  projectsRepo.delete(projectId);
}

export function listMembers(projectId: number) {
  ensureProject(projectId);
  return projectsRepo.listMembers(projectId);
}

/** Adding a member requires a global Tech Lead or Admin role. */
export function addMember(ctx: AuthContext, projectId: number, input: AddProjectMemberInput) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);
  ensureProject(projectId);

  if (!projectsRepo.candidates().some((user) => user.id === input.userId))
    throw new ApiError(ErrorCode.VALIDATION, "Unknown participant.");
  if (projectsRepo.findMembership(projectId, input.userId)) {
    throw new ApiError(ErrorCode.CONFLICT, "User is already a project member.");
  }

  return projectsRepo.addMember({
    projectId,
    userId: input.userId,
  });
}

/** Removing a member requires a global Tech Lead or Admin role. */
export function removeMember(ctx: AuthContext, projectId: number, userId: number) {
  requireGlobalRole(ctx, ["admin", "tech_lead"]);
  ensureProject(projectId);
  projectsRepo.removeMember(projectId, userId);
}
export function requireProjectAccess(ctx: AuthContext, projectId: number) {
  ensureProject(projectId);
  requireProjectMember(ctx, projectId);
}
export function listCandidates(ctx: AuthContext) {
  requireGlobalRole(ctx, ["tech_lead", "admin"]);
  return projectsRepo.candidates();
}

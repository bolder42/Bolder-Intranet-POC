import { eq } from "drizzle-orm";
import { getDb, projectMembers, scopedByProject } from "@bolder/db";
import { ApiError, ErrorCode, type Role } from "@bolder/shared";
import type { AuthContext, SessionUser } from "./session.js";

/**
 * Project-scoped role resolution.
 *
 * Global roles live on `users.role`; per-project roles live on
 * `project_members.role`. Admins bypass every check (MODULES.md: admins have
 * access to all operations even when not explicitly stated).
 */

function findMembership(projectId: number, userId: number) {
  return getDb()
    .select()
    .from(projectMembers)
    .where(
      scopedByProject(projectMembers, projectId, eq(projectMembers.userId, userId)),
    )
    .get();
}

/** Throws 403 unless the user's global role is in `roles` (admin always passes). */
export function requireGlobalRole(ctx: AuthContext, roles: Role[]): void {
  if (ctx.user.role === "admin") return;
  if (!roles.includes(ctx.user.role)) {
    throw new ApiError(
      ErrorCode.FORBIDDEN,
      `Requires one of the following roles: ${roles.join(", ")}.`,
    );
  }
}

/** Throws 403 unless the user is the project's lead or a global admin. */
export function requireProjectLead(ctx: AuthContext, projectId: number): void {
  if (ctx.user.role === "admin") return;
  const membership = findMembership(projectId, ctx.user.id);
  if (membership?.role !== "lead") {
    throw new ApiError(
      ErrorCode.FORBIDDEN,
      "Only a project lead can perform this action.",
    );
  }
}

/** Throws 403 unless the user belongs to the project or is a global admin. */
export function requireProjectMember(ctx: AuthContext, projectId: number): void {
  if (ctx.user.role === "admin") return;
  const membership = findMembership(projectId, ctx.user.id);
  if (!membership) {
    throw new ApiError(
      ErrorCode.FORBIDDEN,
      "You are not a member of this project.",
    );
  }
}

/**
 * Boolean variant used by the frontend to derive UI hints (e.g. show/hide a
 * "New project" button). Returns true when the user may modify the project:
 * global admin, or a lead of that project.
 */
export function canWriteProject(user: SessionUser, projectId: number): boolean {
  if (user.role === "admin") return true;
  return findMembership(projectId, user.id)?.role === "lead";
}

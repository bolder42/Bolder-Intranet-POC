import { eq } from "drizzle-orm";
import { getDb, projectMembers, scopedByProject } from "@bolder/db";
import { ApiError, ErrorCode, type Role } from "@bolder/shared";
import type { AuthContext, SessionUser } from "./session.js";

/**
 * Authorization is global (admin / tech_lead / dev). There is no per-project
 * role — Tech Lead is a single global position, not one per project. See
 * AGENTS.md §5 and INFRA.md §7.
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
 * Boolean variant for UI hints (show/hide a "New project" button, etc.).
 * True when the user's global role can write to projects: tech_lead or admin.
 */
export function canWriteProject(user: SessionUser): boolean {
  return user.role === "admin" || user.role === "tech_lead";
}
import { z } from "zod";

/**
 * Global roles, in increasing order of access: Dev < Tech Lead < Admin.
 * (MODULES.md § Roles.)
 */
export const RoleSchema = z.enum(["dev", "tech_lead", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

export const ROLES = RoleSchema.options;

/** Numeric rank, useful for "at least" comparisons. */
export const ROLE_RANK = {
  dev: 0,
  tech_lead: 1,
  admin: 2,
} as const satisfies Record<Role, number>;

/**
 * Returns true when `actual` is at least as privileged as `required`.
 * Admins pass every check (MODULES.md: admins have access to all operations).
 */
export function hasAtLeastGlobal(actual: Role, required: Role): boolean {
  if (actual === "admin") return true;
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

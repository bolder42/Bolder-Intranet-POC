import type { Role } from '@bolder/shared';

/**
 * Join class names, skipping falsy values.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const ROLE_LABELS: Record<Role, string> = {
  dev: 'Dev',
  tech_lead: 'Tech Lead',
  admin: 'Admin',
};

/**
 * Human-readable label for a user role (see MODULES.md → Roles:
 * Dev, Tech Lead, Admin). Unknown values are returned as-is so the UI never
 * shows an empty badge.
 */
export function getRoleLabel(role?: Role | string | null): string {
  if (!role) return 'Member';
  return ROLE_LABELS[role.toLowerCase() as Role] ?? role;
}
import { z } from "zod";
import { RoleSchema } from "./roles.js";

/**
 * Derived lifecycle state of an invite. Never stored as a column: the API
 * computes it from `revokedAt` / `usedAt` / `expiresAt`.
 */
export const InviteStatusSchema = z.enum(["active", "used", "revoked", "expired"]);
export type InviteStatus = z.infer<typeof InviteStatusSchema>;

/**
 * Wire shape returned by the invites API. `status` is derived server-side and
 * is not a database column.
 */
export const InviteSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  role: RoleSchema,
  status: InviteStatusSchema,
  createdBy: z.number().int().positive(),
  createdAt: z.number().int(),
  expiresAt: z.number().int(),
  revokedAt: z.number().int().nullable(),
  usedAt: z.number().int().nullable(),
  usedBy: z.number().int().nullable(),
});
export type Invite = z.infer<typeof InviteSchema>;

export const CreateInviteSchema = z.object({
  role: RoleSchema.default("dev"),
  expiresInDays: z.number().int().min(1).max(365).default(7),
});
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;

export const ValidateInviteSchema = z.object({
  code: z.string().trim().min(1).max(64),
});
export type ValidateInviteInput = z.infer<typeof ValidateInviteSchema>;

/**
 * Public (unauthenticated) validation result. Deliberately does not leak any
 * creator/usage metadata beyond the role the invite grants.
 */
export const InviteValidationSchema = z.object({
  valid: z.boolean(),
  role: RoleSchema.optional(),
  reason: z.enum(["not_found", "used", "revoked", "expired"]).optional(),
});
export type InviteValidation = z.infer<typeof InviteValidationSchema>;

export const InviteListSchema = z.object({ invites: z.array(InviteSchema) });
export type InviteList = z.infer<typeof InviteListSchema>;

/** The subset of invite fields the status helpers need. */
export type InviteStatusInput = {
  revokedAt: number | null;
  usedAt: number | null;
  expiresAt: number;
};

/**
 * Status precedence: revoked → used → expired → active.
 *
 * An invite that was revoked after being used reports `revoked`; that ordering
 * is intentional (revocation is the stronger, explicit admin action).
 */
export function getInviteStatus(invite: InviteStatusInput, now: number = Date.now()): InviteStatus {
  if (invite.revokedAt !== null) return "revoked";
  if (invite.usedAt !== null) return "used";
  if (invite.expiresAt <= now) return "expired";
  return "active";
}

/** True only when the invite is currently `active` and expiring in the future. */
export function isInviteRedeemable(invite: InviteStatusInput, now: number = Date.now()): boolean {
  return getInviteStatus(invite, now) === "active";
}

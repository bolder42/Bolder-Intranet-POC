import { requireGlobalRole } from "@bolder/auth";
import type { AuthContext } from "@bolder/auth";
import {
  ApiError,
  ErrorCode,
  getInviteStatus,
  type CreateInviteInput,
  type Invite as SharedInvite,
  type InviteValidation,
} from "@bolder/shared";
import { generateInviteCode, normalizeInviteCode } from "./invite-code.js";
import { invitesRepo, type InviteRow } from "./invites.repo.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("UNIQUE constraint failed")
  );
}

/** Maps a DB row to the shared wire shape, deriving `status` server-side. */
export function toWire(row: InviteRow): SharedInvite {
  return {
    id: row.id,
    code: row.code,
    role: row.role,
    status: getInviteStatus(row),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    usedAt: row.usedAt,
    usedBy: row.usedBy,
  };
}

/** Creating an invite is admin-only. */
export function createInvite(
  ctx: AuthContext,
  input: CreateInviteInput,
): SharedInvite {
  requireGlobalRole(ctx, ["admin"]);

  const expiresAt = Date.now() + input.expiresInDays * DAY_MS;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateInviteCode();
    if (invitesRepo.findByCode(code)) continue;

    try {
      const row = invitesRepo.create({
        code,
        role: input.role,
        createdBy: ctx.user.id,
        expiresAt,
      });
      return toWire(row);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  throw new ApiError(
    ErrorCode.INTERNAL,
    "Could not allocate a unique invitation code.",
  );
}

/** Listing invites is admin-only. Newest first. */
export function listInvites(ctx: AuthContext): SharedInvite[] {
  requireGlobalRole(ctx, ["admin"]);
  return invitesRepo.listAll().map(toWire);
}

/** Revoking is admin-only. Used invites are never revocable. */
export function revokeInvite(ctx: AuthContext, id: number): SharedInvite {
  requireGlobalRole(ctx, ["admin"]);

  const row = invitesRepo.findById(id);
  if (!row) {
    throw new ApiError(ErrorCode.NOT_FOUND, "Invitation not found.");
  }

  const status = getInviteStatus(row);
  if (status === "used") {
    throw new ApiError(
      ErrorCode.CONFLICT,
      "Used invitations cannot be revoked.",
    );
  }
  if (status === "revoked") {
    // Idempotent: revoking twice is not an error.
    return toWire(row);
  }

  const updated = invitesRepo.markRevoked(id, Date.now());
  if (!updated) {
    // Lost a race with a concurrent redemption/revocation — re-read and let
    // the resulting status speak for itself.
    const current = invitesRepo.findById(id);
    if (!current) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Invitation not found.");
    }
    return toWire(current);
  }

  return toWire(updated);
}

/**
 * Public validation. Deliberately leaks nothing beyond the role the invite
 * grants when it is redeemable.
 */
export function validateInvite(rawCode: string): InviteValidation {
  const row = invitesRepo.findByCode(normalizeInviteCode(rawCode));
  if (!row) return { valid: false, reason: "not_found" };

  const status = getInviteStatus(row);
  if (status === "active") return { valid: true, role: row.role };

  return { valid: false, reason: status };
}

/**
 * Resolves a code to a redeemable invite row, throwing a specific error for
 * every non-redeemable state. Read-only — it never touches the invite.
 */
function loadRedeemableInvite(rawCode: string): InviteRow {
  const row = invitesRepo.findByCode(normalizeInviteCode(rawCode));
  if (!row) {
    throw new ApiError(ErrorCode.VALIDATION, "Invitation code is not valid.");
  }

  const status = getInviteStatus(row);
  if (status === "revoked") {
    throw new ApiError(ErrorCode.VALIDATION, "This invitation has been revoked.");
  }
  if (status === "used") {
    throw new ApiError(
      ErrorCode.CONFLICT,
      "This invitation has already been used.",
    );
  }
  if (status === "expired") {
    throw new ApiError(ErrorCode.VALIDATION, "This invitation has expired.");
  }

  return row;
}

/**
 * Read-only redeemability check so `register` can reject a bad code *before*
 * it consults the user table or hashes a password. Validating first keeps an
 * unauthenticated caller from using registration to probe which emails exist,
 * and stops invalid codes from burning CPU in scrypt.
 */
export function assertInviteRedeemable(rawCode: string): void {
  loadRedeemableInvite(rawCode);
}

/**
 * Internal redemption, called by the auth module during registration. The
 * caller is unauthenticated by definition, so there is no `AuthContext` here.
 *
 * The role comes from the invite row — never from the request payload.
 */
export function redeemInvite(input: {
  code: string;
  email: string;
  name: string;
  passwordHash: string;
}) {
  const row = loadRedeemableInvite(input.code);

  let result: ReturnType<typeof invitesRepo.claimAndCreateUser>;
  try {
    result = invitesRepo.claimAndCreateUser({
      inviteId: row.id,
      now: Date.now(),
      user: {
        email: input.email,
        name: input.name,
        role: row.role,
        passwordHash: input.passwordHash,
      },
    });
  } catch (error) {
    // Two concurrent registrations can both pass the pre-insert email check;
    // the loser trips the unique constraint. The transaction has rolled back,
    // so the invite was NOT burned — report the conflict instead of a 500.
    if (isUniqueViolation(error)) {
      throw new ApiError(ErrorCode.CONFLICT, "Email already registered.");
    }
    throw error;
  }

  if (!result) {
    throw new ApiError(
      ErrorCode.CONFLICT,
      "This invitation is no longer available.",
    );
  }

  return result;
}

import type { User } from "@bolder/db";
import { ApiError, ErrorCode, type UpdateMeInput, type UserProfile } from "@bolder/shared";
import { usersRepo } from "./users.repo.js";

function toProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    image: user.image,
  };
}

/** Current user's profile. The auth middleware already proved existence. */
export function getProfile(userId: number): UserProfile {
  const user = usersRepo.findById(userId);
  if (!user) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "User no longer exists.");
  }
  return toProfile(user);
}

/**
 * Partial profile update. `image: ""` clears the photo (mapped to null);
 * keys absent from the input are left untouched.
 */
export function updateProfile(userId: number, input: UpdateMeInput): UserProfile {
  const patch: { name?: string; image?: string | null } = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.image !== undefined) patch.image = input.image === "" ? null : input.image;

  const updated = usersRepo.updateMe(userId, patch);
  if (!updated) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "User no longer exists.");
  }
  return toProfile(updated);
}

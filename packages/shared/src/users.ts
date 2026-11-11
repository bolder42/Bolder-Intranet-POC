import { z } from "zod";
import { RoleSchema } from "./roles.js";

/** The current user's profile as returned by GET / PATCH /api/users/me. */
export const UserProfileSchema = z.object({
  id: z.number(),
  email: z.email(),
  name: z.string(),
  role: RoleSchema,
  image: z.string().nullable(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Profile photo URL: only http(s) schemes are accepted (blocks `javascript:`
 * and other script-bearing schemes). The empty string is allowed as a
 * sentinel meaning "clear the photo"; the service maps it to null.
 */
const ProfileImageSchema = z
  .string()
  .max(500)
  .refine((value) => value === "" || /^https?:\/\//.test(value), {
    message: "Image must be an http(s) URL.",
  });

/**
 * Partial profile update. Only the keys present are persisted; `image: ""`
 * clears the photo. There is intentionally no language field: the PT
 * language button is UI-only until translations exist (see MODULES.md).
 */
export const UpdateMeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  image: ProfileImageSchema.optional(),
});
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;

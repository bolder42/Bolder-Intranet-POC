import { z } from "zod";
import { RoleSchema } from "./roles.js";

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Registration is invite-gated: the account's global role is derived
 * server-side from the invite, so a client-supplied `role` is intentionally
 * NOT accepted here (it would be a privilege-escalation hole).
 */
export const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  inviteCode: z.string().trim().min(1),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const UserPublicSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  role: RoleSchema,
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

export const AuthResponseSchema = z.object({
  user: UserPublicSchema,
  token: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

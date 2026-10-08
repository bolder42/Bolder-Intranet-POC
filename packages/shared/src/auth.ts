import { z } from "zod";
import { RoleSchema } from "./roles.js";

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: RoleSchema.optional().default("dev"),
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

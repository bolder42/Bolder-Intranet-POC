import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { User } from "@bolder/db";
import { LoginSchema, RegisterSchema, type UserPublic } from "@bolder/shared";
import type { AppEnv } from "../../app.js";
import { authMiddleware } from "../../middleware/auth.js";
import { zodErrorHook } from "../../middleware/error.js";
import { register, signToken, verify } from "./auth.service.js";

function toPublic(user: User): UserPublic {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export const authRoutes = new Hono<AppEnv>()
  .post("/register", zValidator("json", RegisterSchema, zodErrorHook), (c) => {
    const user = register(c.req.valid("json"));
    return c.json({ user: toPublic(user), token: signToken(user) }, 201);
  })
  .post("/verify", zValidator("json", LoginSchema, zodErrorHook), (c) => {
    const { email, password } = c.req.valid("json");
    const user = verify(email, password);
    return c.json({ user: toPublic(user), token: signToken(user) });
  })
  .get("/me", authMiddleware, (c) => c.json({ user: c.get("user") }));

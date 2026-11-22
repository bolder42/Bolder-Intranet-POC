import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UpdateMeSchema } from "@bolder/shared";
import type { AppEnv } from "../../app.js";
import { authMiddleware } from "../../middleware/auth.js";
import { zodErrorHook } from "../../middleware/error.js";
import { getProfile, updateProfile } from "./users.service.js";

/**
 * Current-user profile endpoints. Everything is scoped to the authenticated
 * caller (`/me`): there is no way to read or write another user's profile.
 */
export const usersRoutes = new Hono<AppEnv>()
  .get("/me", authMiddleware, (c) => c.json({ user: getProfile(c.get("user").id) }))
  .patch(
    "/me",
    authMiddleware,
    zValidator("json", UpdateMeSchema, zodErrorHook),
    (c) => c.json({ user: updateProfile(c.get("user").id, c.req.valid("json")) }),
  );

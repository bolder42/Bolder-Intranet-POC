import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AuthContext } from "@bolder/auth";
import {
  ApiError,
  CreateInviteSchema,
  ErrorCode,
  ValidateInviteSchema,
} from "@bolder/shared";
import type { AppEnv } from "../../app.js";
import { authMiddleware } from "../../middleware/auth.js";
import { zodErrorHook } from "../../middleware/error.js";
import {
  createInvite,
  listInvites,
  revokeInvite,
  validateInvite,
} from "./invites.service.js";

function ctx(c: { get: (key: "user") => AuthContext["user"] }): AuthContext {
  return { user: c.get("user") };
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(ErrorCode.VALIDATION, "Invalid invitation id.");
  }
  return id;
}

/**
 * `/validate` is intentionally public (the register form needs it before the
 * user has a session), so `authMiddleware` is applied per-route instead of
 * via `.use("*", ...)` — the latter would also guard `/validate`.
 */
export const invitesRoutes = new Hono<AppEnv>()
  .post(
    "/validate",
    zValidator("json", ValidateInviteSchema, zodErrorHook),
    (c) => c.json(validateInvite(c.req.valid("json").code)),
  )
  .post(
    "/",
    authMiddleware,
    zValidator("json", CreateInviteSchema, zodErrorHook),
    (c) => c.json({ invite: createInvite(ctx(c), c.req.valid("json")) }, 201),
  )
  .get("/", authMiddleware, (c) => c.json({ invites: listInvites(ctx(c)) }))
  .post("/:id/revoke", authMiddleware, (c) =>
    c.json({ invite: revokeInvite(ctx(c), parseId(c.req.param("id"))) }),
  );

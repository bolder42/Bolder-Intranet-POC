import { createMiddleware } from "hono/factory";
import type { SessionUser } from "@bolder/auth";
import { ApiError, ErrorCode } from "@bolder/shared";
import type { AppEnv } from "../app.js";
import { usersRepo } from "../modules/auth/auth.repo.js";
import { verifyToken } from "../modules/auth/auth.service.js";

const BEARER_PREFIX = "Bearer ";

/**
 * Extracts the HS256 JWT from the `Authorization: Bearer <token>` header,
 * verifies it, loads the user and exposes it as `c.get("user")`.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith(BEARER_PREFIX)) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Missing bearer token.");
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  let payload: { sub: number; role: SessionUser["role"] };
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Invalid or expired token.");
  }

  const user = usersRepo.findById(payload.sub);
  if (!user) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "User no longer exists.");
  }

  c.set("user", {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  await next();
});

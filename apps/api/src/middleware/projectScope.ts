import { createMiddleware } from "hono/factory";
import { ApiError, ErrorCode } from "@bolder/shared";
import type { AppEnv } from "../app.js";

/**
 * Resolves the `:projectId` path param into a validated numeric id and
 * exposes it as `c.get("projectId")`. Use on any route that carries
 * `:projectId`.
 */
export const projectScope = createMiddleware<AppEnv>(async (c, next) => {
  const raw = c.req.param("projectId");
  const projectId = Number(raw);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new ApiError(ErrorCode.VALIDATION, "Invalid projectId.");
  }

  c.set("projectId", projectId);
  await next();
});

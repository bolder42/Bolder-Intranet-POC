import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AuthContext } from "@bolder/auth";
import {
  ApiError,
  CreateScheduleItemSchema,
  ErrorCode,
  UpdateScheduleItemSchema,
} from "@bolder/shared";
import type { AppEnv } from "../../app.js";
import { authMiddleware } from "../../middleware/auth.js";
import { zodErrorHook } from "../../middleware/error.js";
import { projectScope } from "../../middleware/projectScope.js";
import { createItem, deleteItem, listItems, updateItem } from "./schedule.service.js";

function ctx(c: { get: (key: "user") => AuthContext["user"] }): AuthContext {
  return { user: c.get("user") };
}

/** Validates the `:itemId` path param into a positive integer. */
function parseItemId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(ErrorCode.VALIDATION, "Invalid itemId.");
  }
  return id;
}

export const scheduleRoutes = new Hono<AppEnv>()
  .use(authMiddleware)
  .get("/:projectId", projectScope, (c) => {
    const items = listItems(ctx(c), c.get("projectId"));
    return c.json({ items });
  })
  .post(
    "/:projectId",
    projectScope,
    zValidator("json", CreateScheduleItemSchema, zodErrorHook),
    (c) => {
      const item = createItem(ctx(c), c.get("projectId"), c.req.valid("json"));
      return c.json({ item }, 201);
    },
  )
  .patch(
    "/:projectId/:itemId",
    projectScope,
    zValidator("json", UpdateScheduleItemSchema, zodErrorHook),
    (c) => {
      const item = updateItem(
        ctx(c),
        c.get("projectId"),
        parseItemId(c.req.param("itemId")),
        c.req.valid("json"),
      );
      return c.json({ item });
    },
  )
  .delete("/:projectId/:itemId", projectScope, (c) => {
    deleteItem(ctx(c), c.get("projectId"), parseItemId(c.req.param("itemId")));
    return c.json({ ok: true });
  });

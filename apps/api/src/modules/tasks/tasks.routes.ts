import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AuthContext } from "@bolder/auth";
import {
  ApiError,
  ErrorCode,
  CreateTaskSchema,
  MoveTaskSchema,
  UpdateTaskSchema,
} from "@bolder/shared";
import type { AppEnv } from "../../app.js";
import { authMiddleware } from "../../middleware/auth.js";
import { zodErrorHook } from "../../middleware/error.js";
import { projectScope } from "../../middleware/projectScope.js";
import {
  createTask,
  deleteTask,
  listTaskEvents,
  listTasks,
  moveTask,
  updateTask,
} from "./tasks.service.js";

function ctx(c: { get: (key: "user") => AuthContext["user"] }): AuthContext {
  return { user: c.get("user") };
}

/** `:taskId` is a path param, so it needs the same numeric guard as `:projectId`. */
function taskIdOf(c: { req: { param: (name: string) => string | undefined } }): number {
  const taskId = Number(c.req.param("taskId"));
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new ApiError(ErrorCode.VALIDATION, "Invalid taskId.");
  }
  return taskId;
}

export const tasksRoutes = new Hono<AppEnv>()
  .use(authMiddleware)
  .get("/:projectId", projectScope, (c) => {
    const tasks = listTasks(ctx(c), c.get("projectId"));
    return c.json({ tasks });
  })
  .post("/:projectId", projectScope, zValidator("json", CreateTaskSchema, zodErrorHook), (c) => {
    const task = createTask(ctx(c), c.get("projectId"), c.req.valid("json"));
    return c.json({ task }, 201);
  })
  .patch(
    "/:projectId/:taskId",
    projectScope,
    zValidator("json", UpdateTaskSchema, zodErrorHook),
    (c) => {
      const task = updateTask(ctx(c), c.get("projectId"), taskIdOf(c), c.req.valid("json"));
      return c.json({ task });
    },
  )
  .patch(
    "/:projectId/:taskId/status",
    projectScope,
    zValidator("json", MoveTaskSchema, zodErrorHook),
    (c) => {
      const task = moveTask(ctx(c), c.get("projectId"), taskIdOf(c), c.req.valid("json"));
      return c.json({ task });
    },
  )
  .delete("/:projectId/:taskId", projectScope, (c) => {
    deleteTask(ctx(c), c.get("projectId"), taskIdOf(c));
    return c.json({ ok: true });
  })
  .get("/:projectId/:taskId/events", projectScope, (c) => {
    const events = listTaskEvents(ctx(c), c.get("projectId"), taskIdOf(c));
    return c.json({ events });
  });

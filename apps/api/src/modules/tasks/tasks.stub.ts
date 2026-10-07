import { Hono } from "hono";
import type { AppEnv } from "../../app.js";

// TODO(tasks): the Tasks module owner must create
//   apps/api/src/modules/tasks/tasks.routes.ts
// with the real kanban endpoints (list/create/update status), scoped via
// `scopedByProject` and guarded by `requireProjectMember`.
export const tasksRoutes = new Hono<AppEnv>().get("/", (c) =>
  c.json({ error: "Not Implemented" }, 501),
);

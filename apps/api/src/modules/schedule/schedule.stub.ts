import { Hono } from "hono";
import type { AppEnv } from "../../app.js";

// TODO(schedule): the Schedule module owner must create
//   apps/api/src/modules/schedule/schedule.routes.ts
// with the real schedule endpoints, scoped via `scopedByProject` and guarded
// by `requireGlobalRole(ctx, ['admin', 'tech_lead'])` for writes.
export const scheduleRoutes = new Hono<AppEnv>().get("/", (c) =>
  c.json({ error: "Not Implemented" }, 501),
);

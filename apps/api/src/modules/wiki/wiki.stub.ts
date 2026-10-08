import { Hono } from "hono";
import type { AppEnv } from "../../app.js";

// TODO(wiki): the Wiki module owner must create
//   apps/api/src/modules/wiki/wiki.routes.ts
// with the real wiki endpoints, scoped via `scopedByProject` and guarded by
// `requireProjectMember`.
export const wikiRoutes = new Hono<AppEnv>().get("/", (c) =>
  c.json({ error: "Not Implemented" }, 501),
);

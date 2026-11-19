import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { CreateWikiSchema, UpdateWikiSchema, ApiError, ErrorCode } from "@bolder/shared";
import type { AuthContext } from "@bolder/auth";
import type { AppEnv } from "../../app.js";
import { authMiddleware } from "../../middleware/auth.js";
import { projectScope } from "../../middleware/projectScope.js";
import { zodErrorHook } from "../../middleware/error.js";
import {
  createWikiPage,
  deleteWikiPage,
  getWikiPage,
  listWiki,
  updateWikiPage,
} from "./wiki.service.js";

function ctx(c: { get: (key: "user") => AuthContext["user"] }): AuthContext {
  return { user: c.get("user") };
}

function pageId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(ErrorCode.VALIDATION, "Invalid pageId.");
  return id;
}

export const wikiRoutes = new Hono<AppEnv>()
  .use(authMiddleware)
  .get("/:projectId", projectScope, (c) => c.json({ pages: listWiki(ctx(c), c.get("projectId")) }))
  .post("/:projectId", projectScope, zValidator("json", CreateWikiSchema, zodErrorHook), (c) =>
    c.json({ page: createWikiPage(ctx(c), c.get("projectId"), c.req.valid("json")) }, 201),
  )
  .get("/:projectId/:pageId", projectScope, (c) =>
    c.json({ page: getWikiPage(ctx(c), c.get("projectId"), pageId(c.req.param("pageId"))) }),
  )
  .patch(
    "/:projectId/:pageId",
    projectScope,
    zValidator("json", UpdateWikiSchema, zodErrorHook),
    (c) =>
      c.json({
        page: updateWikiPage(
          ctx(c),
          c.get("projectId"),
          pageId(c.req.param("pageId")),
          c.req.valid("json"),
        ),
      }),
  )
  .delete("/:projectId/:pageId", projectScope, (c) => {
    deleteWikiPage(ctx(c), c.get("projectId"), pageId(c.req.param("pageId")));
    return c.json({ ok: true });
  });

import { Hono } from "hono";
import type { AppEnv } from "../../app.js";
import { authMiddleware } from "../../middleware/auth.js";
import { getHomeSummary } from "./home.service.js";

export const homeRoutes = new Hono<AppEnv>()
  .use(authMiddleware)
  .get("/summary", (c) => c.json(getHomeSummary({ user: c.get("user") })));

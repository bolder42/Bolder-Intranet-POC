import { Hono } from "hono";
import type { SessionUser } from "@bolder/auth";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { homeRoutes } from "./modules/home/home.routes.js";
import { projectsRoutes } from "./modules/projects/projects.routes.js";
import { scheduleRoutes } from "./modules/schedule/schedule.stub.js";
import { tasksRoutes } from "./modules/tasks/tasks.stub.js";
import { wikiRoutes } from "./modules/wiki/wiki.stub.js";
import { errorHandler } from "./middleware/error.js";

/** Hono variables available on every request. */
export type AppEnv = {
  Variables: {
    user: SessionUser;
    projectId: number;
  };
};

// Chained construction is load-bearing: `typeof app` must see every route so
// `hc<AppType>` on the frontend is fully typed. Do NOT break the chain.
export const app = new Hono<AppEnv>()
  .basePath("/api")
  .onError(errorHandler)
  .get("/health", (c) => c.json({ ok: true }))
  .route("/auth", authRoutes)
  .route("/projects", projectsRoutes)
  .route("/home", homeRoutes)
  .route("/tasks", tasksRoutes)
  .route("/wiki", wikiRoutes)
  .route("/schedule", scheduleRoutes);

export type AppType = typeof app;

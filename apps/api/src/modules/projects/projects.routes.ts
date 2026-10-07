import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AuthContext } from "@bolder/auth";
import {
  AddProjectMemberSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
} from "@bolder/shared";
import type { AppEnv } from "../../app.js";
import { authMiddleware } from "../../middleware/auth.js";
import { zodErrorHook } from "../../middleware/error.js";
import { projectScope } from "../../middleware/projectScope.js";
import {
  addMember,
  createProject,
  deleteProject,
  getProject,
  listMembers,
  listProjects,
  updateProject,
} from "./projects.service.js";

function ctx(c: { get: (key: "user") => AuthContext["user"] }): AuthContext {
  return { user: c.get("user") };
}

export const projectsRoutes = new Hono<AppEnv>()
  .use(authMiddleware)
  .get("/", (c) => c.json({ projects: listProjects(ctx(c)) }))
  .post("/", zValidator("json", CreateProjectSchema, zodErrorHook), (c) => {
    const project = createProject(ctx(c), c.req.valid("json"));
    return c.json({ project }, 201);
  })
  .get("/:projectId", projectScope, (c) => {
    const project = getProject(c.get("projectId"));
    return c.json({ project, members: listMembers(c.get("projectId")) });
  })
  .patch(
    "/:projectId",
    projectScope,
    zValidator("json", UpdateProjectSchema, zodErrorHook),
    (c) => {
      const project = updateProject(
        ctx(c),
        c.get("projectId"),
        c.req.valid("json"),
      );
      return c.json({ project });
    },
  )
  .delete("/:projectId", projectScope, (c) => {
    deleteProject(ctx(c), c.get("projectId"));
    return c.json({ ok: true });
  })
  .get("/:projectId/members", projectScope, (c) => {
    return c.json({ members: listMembers(c.get("projectId")) });
  })
  .post(
    "/:projectId/members",
    projectScope,
    zValidator("json", AddProjectMemberSchema, zodErrorHook),
    (c) => {
      const member = addMember(
        ctx(c),
        c.get("projectId"),
        c.req.valid("json"),
      );
      return c.json({ member }, 201);
    },
  );

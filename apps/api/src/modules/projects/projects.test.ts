import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authHeaders,
  registerUser,
  setupTestApp,
  type TestHarness,
} from "../../../test/helpers.js";

let h: TestHarness;
let techToken: string;
let adminToken: string;
let devToken: string;

beforeEach(async () => {
  h = await setupTestApp();

  const tech = await registerUser(h.app, {
    email: "tech@bolder.local",
    password: "password123",
    name: "Tech",
    role: "tech_lead",
  });
  const admin = await registerUser(h.app, {
    email: "admin@bolder.local",
    password: "password123",
    name: "Admin",
    role: "admin",
  });
  const dev = await registerUser(h.app, {
    email: "dev@bolder.local",
    password: "password123",
    name: "Dev",
    role: "dev",
  });

  techToken = tech.token;
  adminToken = admin.token;
  devToken = dev.token;
});

afterEach(() => {
  h.cleanup();
});

async function createProject(token: string, name: string) {
  const res = await h.app.request("/api/projects", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return res;
}

describe("projects module", () => {
  it("allows a member Tech Lead to delete with cascade and denies a nonmember Tech Lead", async () => {
    const created = (await (await createProject(techToken, "Delete me")).json()) as {
      project: { id: number };
    };
    const other = await registerUser(h.app, {
      email: "other-tech@bolder.local",
      password: "password123",
      name: "Other",
      role: "tech_lead",
    });
    const path = `/api/projects/${created.project.id}`;
    expect(
      (await h.app.request(path, { method: "DELETE", headers: authHeaders(other.token) })).status,
    ).toBe(403);
    const { tasks, wikiPages, scheduleItems, projectMembers } = h.mod;
    h.db.insert(tasks).values({ projectId: created.project.id, title: "Task" }).run();
    h.db
      .insert(wikiPages)
      .values({ projectId: created.project.id, title: "Wiki", content: "Content" })
      .run();
    h.db
      .insert(scheduleItems)
      .values({
        projectId: created.project.id,
        title: "Milestone",
        kind: "milestone",
        dueAt: Date.now(),
      })
      .run();
    expect(
      (await h.app.request(path, { method: "DELETE", headers: authHeaders(techToken) })).status,
    ).toBe(200);
    for (const table of [tasks, wikiPages, scheduleItems, projectMembers])
      expect(h.db.select().from(table).all()).toHaveLength(0);
    expect((await h.app.request(path, { headers: authHeaders(adminToken) })).status).toBe(404);
    expect(
      (await h.app.request(path, { method: "DELETE", headers: authHeaders(adminToken) })).status,
    ).toBe(404);
  });
  it("persists deadlines and public participant details in list and detail", async () => {
    const participant = await registerUser(h.app, {
      email: "participant@bolder.local",
      password: "password123",
      name: "Participant",
      role: "dev",
    });
    const deadline = Date.UTC(2026, 10, 6);
    const response = await h.app.request("/api/projects", {
      method: "POST",
      headers: authHeaders(techToken),
      body: JSON.stringify({
        name: "  New project  ",
        deadline,
        memberIds: [participant.user.id, participant.user.id],
      }),
    });
    expect(response.status).toBe(201);
    const { project } = (await response.json()) as {
      project: { id: number; name: string; deadline: number };
    };
    expect(project.name).toBe("New project");
    expect(project.deadline).toBe(deadline);
    const detailResponse = await h.app.request(`/api/projects/${project.id}`, {
      headers: authHeaders(participant.token),
    });
    expect(detailResponse.status).toBe(200);
    const detail = (await detailResponse.json()) as {
      members: Array<{ user: { name: string; passwordHash?: string } }>;
    };
    expect(detail.members).toHaveLength(2);
    expect(detail.members.some((member) => member.user.name === "Participant")).toBe(true);
    expect(JSON.stringify(detail)).not.toContain("passwordHash");
    const list = (await (
      await h.app.request("/api/projects", { headers: authHeaders(participant.token) })
    ).json()) as { projects: Array<{ deadline: number; members: unknown[] }> };
    expect(list.projects[0]?.deadline).toBe(deadline);
    expect(list.projects[0]?.members).toHaveLength(2);
    const update = await h.app.request(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: authHeaders(techToken),
      body: JSON.stringify({ deadline: null }),
    });
    expect(update.status).toBe(200);
    expect(((await update.json()) as { project: { deadline: null } }).project.deadline).toBeNull();
  });

  it("denies nonmembers access to project details, members and updates", async () => {
    const { project } = (await (await createProject(adminToken, "Private")).json()) as {
      project: { id: number };
    };
    for (const token of [devToken, techToken]) {
      for (const path of [`/api/projects/${project.id}`, `/api/projects/${project.id}/members`]) {
        expect((await h.app.request(path, { headers: authHeaders(token) })).status).toBe(403);
      }
      expect(
        (
          await h.app.request(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: authHeaders(token),
            body: JSON.stringify({ name: "Denied" }),
          })
        ).status,
      ).toBe(403);
    }
    expect(
      (await h.app.request(`/api/projects/${project.id}`, { headers: authHeaders(adminToken) }))
        .status,
    ).toBe(200);
  });

  it("restricts candidate discovery and never returns password hashes", async () => {
    expect(
      (await h.app.request("/api/projects/candidates", { headers: authHeaders(devToken) })).status,
    ).toBe(403);
    expect((await h.app.request("/api/projects/candidates")).status).toBe(401);
    for (const token of [techToken, adminToken]) {
      const response = await h.app.request("/api/projects/candidates", {
        headers: authHeaders(token),
      });
      expect(response.status).toBe(200);
      const data = (await response.json()) as { users: unknown[] };
      expect(data.users).toHaveLength(3);
      expect(JSON.stringify(data)).not.toContain("passwordHash");
    }
  });

  it("rejects invalid creation without leaving a partial project", async () => {
    for (const input of [
      { name: "   " },
      { name: "Bad", deadline: -1 },
      { name: "Bad", memberIds: [999999] },
    ]) {
      const response = await h.app.request("/api/projects", {
        method: "POST",
        headers: authHeaders(techToken),
        body: JSON.stringify(input),
      });
      expect(response.status).toBe(422);
    }
    const list = (await (
      await h.app.request("/api/projects", { headers: authHeaders(adminToken) })
    ).json()) as { projects: unknown[] };
    expect(list.projects).toHaveLength(0);
  });
  it("forbids a dev from creating a project", async () => {
    const res = await createProject(devToken, "Nope");
    expect(res.status).toBe(403);
  });

  it("lets a tech_lead create a project and is added as a member", async () => {
    const res = await createProject(techToken, "Apollo");
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      project: { id: number; name: string };
    };
    expect(body.project.name).toBe("Apollo");

    const detailRes = await h.app.request(`/api/projects/${body.project.id}`, {
      headers: authHeaders(techToken),
    });
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as {
      members: Array<{ userId: number }>;
    };
    expect(detail.members.some((m) => (m.userId === undefined ? false : true))).toBe(true);
  });

  it("lets an admin create a project", async () => {
    const res = await createProject(adminToken, "Bolder Intranet");
    expect(res.status).toBe(201);
  });

  it("lists only the projects a user belongs to (admin sees all)", async () => {
    await createProject(techToken, "Apollo");
    await createProject(adminToken, "Bolder Intranet");

    const techList = (await (
      await h.app.request("/api/projects", { headers: authHeaders(techToken) })
    ).json()) as { projects: Array<{ name: string }> };
    expect(techList.projects.map((p) => p.name)).toEqual(["Apollo"]);

    const adminList = (await (
      await h.app.request("/api/projects", { headers: authHeaders(adminToken) })
    ).json()) as { projects: Array<{ name: string }> };
    expect(adminList.projects).toHaveLength(2);

    const devList = (await (
      await h.app.request("/api/projects", { headers: authHeaders(devToken) })
    ).json()) as { projects: Array<{ name: string }> };
    expect(devList.projects).toHaveLength(0);
  });

  it("lets a tech_lead update a project but not a dev", async () => {
    const created = (await (await createProject(techToken, "Apollo")).json()) as {
      project: { id: number };
    };

    const denied = await h.app.request(`/api/projects/${created.project.id}`, {
      method: "PATCH",
      headers: authHeaders(devToken),
      body: JSON.stringify({ name: "Hacked" }),
    });
    expect(denied.status).toBe(403);

    const allowed = await h.app.request(`/api/projects/${created.project.id}`, {
      method: "PATCH",
      headers: authHeaders(techToken),
      body: JSON.stringify({ name: "Apollo v2" }),
    });
    expect(allowed.status).toBe(200);
    const updated = (await allowed.json()) as { project: { name: string } };
    expect(updated.project.name).toBe("Apollo v2");
  });

  it("denies Dev deletion and lets Admin delete any project", async () => {
    const created = (await (await createProject(techToken, "Apollo")).json()) as {
      project: { id: number };
    };

    const denied = await h.app.request(`/api/projects/${created.project.id}`, {
      method: "DELETE",
      headers: authHeaders(devToken),
    });
    expect(denied.status).toBe(403);

    const allowed = await h.app.request(`/api/projects/${created.project.id}`, {
      method: "DELETE",
      headers: authHeaders(adminToken),
    });
    expect(allowed.status).toBe(200);
  });

  it("lets a tech_lead add members and rejects duplicates", async () => {
    const created = (await (await createProject(techToken, "Apollo")).json()) as {
      project: { id: number };
    };

    const devUser = (await registerUser(h.app, {
      email: "second-dev@bolder.local",
      password: "password123",
      name: "Second Dev",
      role: "dev",
    })) as { user: { id: number } };

    const addRes = await h.app.request(`/api/projects/${created.project.id}/members`, {
      method: "POST",
      headers: authHeaders(techToken),
      body: JSON.stringify({ userId: devUser.user.id }),
    });
    expect(addRes.status).toBe(201);

    const dupRes = await h.app.request(`/api/projects/${created.project.id}/members`, {
      method: "POST",
      headers: authHeaders(techToken),
      body: JSON.stringify({ userId: devUser.user.id }),
    });
    expect(dupRes.status).toBe(409);
  });
});

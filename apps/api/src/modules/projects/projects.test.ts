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
  it("forbids a dev from creating a project", async () => {
    const res = await createProject(devToken, "Nope");
    expect(res.status).toBe(403);
  });

  it("lets a tech_lead create a project and become its lead", async () => {
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
      members: Array<{ role: string }>;
    };
    expect(detail.members.some((m) => m.role === "lead")).toBe(true);
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

  it("lets the lead update a project but not an outsider", async () => {
    const created = (await (
      await createProject(techToken, "Apollo")
    ).json()) as { project: { id: number } };

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

  it("restricts project deletion to admins", async () => {
    const created = (await (
      await createProject(techToken, "Apollo")
    ).json()) as { project: { id: number } };

    const denied = await h.app.request(`/api/projects/${created.project.id}`, {
      method: "DELETE",
      headers: authHeaders(techToken),
    });
    expect(denied.status).toBe(403);

    const allowed = await h.app.request(`/api/projects/${created.project.id}`, {
      method: "DELETE",
      headers: authHeaders(adminToken),
    });
    expect(allowed.status).toBe(200);
  });

  it("lets the lead add members and rejects duplicates", async () => {
    const created = (await (
      await createProject(techToken, "Apollo")
    ).json()) as { project: { id: number } };

    const devUser = (await registerUser(h.app, {
      email: "second-dev@bolder.local",
      password: "password123",
      name: "Second Dev",
      role: "dev",
    })) as { user: { id: number } };

    const addRes = await h.app.request(
      `/api/projects/${created.project.id}/members`,
      {
        method: "POST",
        headers: authHeaders(techToken),
        body: JSON.stringify({ userId: devUser.user.id, role: "member" }),
      },
    );
    expect(addRes.status).toBe(201);

    const dupRes = await h.app.request(
      `/api/projects/${created.project.id}/members`,
      {
        method: "POST",
        headers: authHeaders(techToken),
        body: JSON.stringify({ userId: devUser.user.id, role: "member" }),
      },
    );
    expect(dupRes.status).toBe(409);
  });
});

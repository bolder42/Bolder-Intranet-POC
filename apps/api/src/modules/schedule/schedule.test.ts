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
let projectA: number;
let projectB: number;

const DAY = 24 * 60 * 60 * 1000;

async function createProject(token: string, name: string): Promise<number> {
  const res = await h.app.request("/api/projects", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  return ((await res.json()) as { project: { id: number } }).project.id;
}

function createItem(token: string, projectId: number, body: Record<string, unknown>) {
  return h.app.request(`/api/schedule/${projectId}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

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

  projectA = await createProject(techToken, "Apollo");
  projectB = await createProject(adminToken, "Bolder");
});

afterEach(() => {
  h.cleanup();
});

describe("schedule module", () => {
  it("lists items for a member ordered by due date", async () => {
    const now = Date.now();
    await createItem(techToken, projectA, {
      title: "Later",
      kind: "deadline",
      dueAt: now + 2 * DAY,
    });
    await createItem(techToken, projectA, {
      title: "Sooner",
      kind: "milestone",
      dueAt: now + DAY,
    });

    const res = await h.app.request(`/api/schedule/${projectA}`, {
      headers: authHeaders(techToken),
    });
    expect(res.status).toBe(200);
    const { items } = (await res.json()) as { items: Array<{ title: string }> };
    expect(items.map((item) => item.title)).toEqual(["Sooner", "Later"]);
  });

  it("requires authentication and membership to read, but lets admin through", async () => {
    expect((await h.app.request(`/api/schedule/${projectA}`)).status).toBe(401);
    expect(
      (await h.app.request(`/api/schedule/${projectA}`, { headers: authHeaders(devToken) })).status,
    ).toBe(403);
    expect(
      (await h.app.request(`/api/schedule/${projectA}`, { headers: authHeaders(adminToken) }))
        .status,
    ).toBe(200);
  });

  it("forbids a dev from creating, updating or deleting", async () => {
    const created = await createItem(techToken, projectA, {
      title: "Kickoff",
      kind: "milestone",
      dueAt: Date.now(),
    });
    const { item } = (await created.json()) as { item: { id: number } };

    expect(
      (
        await createItem(devToken, projectA, {
          title: "Nope",
          kind: "milestone",
          dueAt: Date.now(),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await h.app.request(`/api/schedule/${projectA}/${item.id}`, {
          method: "PATCH",
          headers: authHeaders(devToken),
          body: JSON.stringify({ title: "Hacked" }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await h.app.request(`/api/schedule/${projectA}/${item.id}`, {
          method: "DELETE",
          headers: authHeaders(devToken),
        })
      ).status,
    ).toBe(403);
  });

  it("lets a tech_lead create and update, and an admin delete", async () => {
    const created = await createItem(techToken, projectA, {
      title: "Kickoff",
      kind: "milestone",
      dueAt: Date.now(),
      description: "Start of the project",
    });
    expect(created.status).toBe(201);
    const { item } = (await created.json()) as {
      item: { id: number; kind: string; description: string | null };
    };
    expect(item.kind).toBe("milestone");
    expect(item.description).toBe("Start of the project");

    const patched = await h.app.request(`/api/schedule/${projectA}/${item.id}`, {
      method: "PATCH",
      headers: authHeaders(techToken),
      body: JSON.stringify({ title: "Kickoff v2", kind: "deadline", description: null }),
    });
    expect(patched.status).toBe(200);
    const updated = (await patched.json()) as {
      item: { title: string; kind: string; description: string | null };
    };
    expect(updated.item.title).toBe("Kickoff v2");
    expect(updated.item.kind).toBe("deadline");
    expect(updated.item.description).toBeNull();

    const deleted = await h.app.request(`/api/schedule/${projectA}/${item.id}`, {
      method: "DELETE",
      headers: authHeaders(adminToken),
    });
    expect(deleted.status).toBe(200);

    const list = (await (
      await h.app.request(`/api/schedule/${projectA}`, { headers: authHeaders(techToken) })
    ).json()) as { items: unknown[] };
    expect(list.items).toHaveLength(0);
  });

  it("rejects invalid payloads with 422", async () => {
    expect(
      (await createItem(techToken, projectA, { title: "  ", kind: "milestone", dueAt: 1 })).status,
    ).toBe(422);
    expect(
      (
        await createItem(techToken, projectA, {
          title: "Bad kind",
          kind: "nope",
          dueAt: Date.now(),
        })
      ).status,
    ).toBe(422);
    expect(
      (await createItem(techToken, projectA, { title: "Bad date", kind: "milestone", dueAt: -1 }))
        .status,
    ).toBe(422);
  });

  it("returns 404 when an item belongs to another project", async () => {
    const created = await createItem(techToken, projectA, {
      title: "Only in A",
      kind: "deadline",
      dueAt: Date.now(),
    });
    const { item } = (await created.json()) as { item: { id: number } };

    expect(
      (
        await h.app.request(`/api/schedule/${projectB}/${item.id}`, {
          method: "PATCH",
          headers: authHeaders(adminToken),
          body: JSON.stringify({ title: "Cross-project" }),
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await h.app.request(`/api/schedule/${projectB}/${item.id}`, {
          method: "DELETE",
          headers: authHeaders(adminToken),
        })
      ).status,
    ).toBe(404);
  });

  it("rejects malformed project and item ids", async () => {
    expect(
      (await h.app.request("/api/schedule/abc", { headers: authHeaders(techToken) })).status,
    ).toBe(422);
    expect(
      (
        await h.app.request(`/api/schedule/${projectA}/abc`, {
          method: "DELETE",
          headers: authHeaders(techToken),
        })
      ).status,
    ).toBe(422);
  });
});

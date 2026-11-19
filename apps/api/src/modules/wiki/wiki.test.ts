import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authHeaders,
  registerUser,
  setupTestApp,
  type TestHarness,
} from "../../../test/helpers.js";

let h: TestHarness;
let memberToken: string;
let adminToken: string;
let outsiderToken: string;
let projectId: number;

beforeEach(async () => {
  h = await setupTestApp();
  adminToken = (
    await registerUser(h.app, {
      email: "admin@bolder.local",
      password: "password123",
      name: "Admin",
      role: "admin",
    })
  ).token;
  outsiderToken = (
    await registerUser(h.app, {
      email: "outsider@bolder.local",
      password: "password123",
      name: "Outsider",
      role: "dev",
    })
  ).token;
  const created = await h.app.request("/api/projects", {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ name: "Wiki project" }),
  });
  projectId = ((await created.json()) as { project: { id: number } }).project.id;
  // Admin is already a participant; add the regular user through the project API.
  const member = await registerUser(h.app, {
    email: "second@bolder.local",
    password: "password123",
    name: "Second",
    role: "dev",
  });
  const add = await h.app.request(`/api/projects/${projectId}/members`, {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ userId: member.user.id }),
  });
  expect(add.status).toBe(201);
  memberToken = member.token;
});

afterEach(() => h.cleanup());

describe("project wiki module", () => {
  it("supports member CRUD, Markdown content, project-scoped titles and admin access", async () => {
    const base = `/api/wiki/${projectId}`;
    const create = await h.app.request(base, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Getting started", content: "# Hello\n\n[[References]]" }),
    });
    expect(create.status).toBe(201);
    const first = (
      (await create.json()) as {
        page: { id: number; projectId: number; content: string; authorId: number };
      }
    ).page;
    expect(first.projectId).toBe(projectId);
    expect(first.content).toContain("[[References]]");

    const second = await h.app.request(base, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "References" }),
    });
    expect(second.status).toBe(201);
    const secondPageId = ((await second.json()) as { page: { id: number } }).page.id;
    expect((await h.app.request(base, { headers: authHeaders(memberToken) })).status).toBe(200);
    expect(
      (await h.app.request(`${base}/${secondPageId}`, { headers: authHeaders(adminToken) })).status,
    ).toBe(200);

    const duplicate = await h.app.request(base, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Getting started" }),
    });
    expect(duplicate.status).toBe(409);
    const update = await h.app.request(`${base}/${first.id}`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Welcome", content: "## Updated" }),
    });
    expect(update.status).toBe(200);
    expect(((await update.json()) as { page: { content: string } }).page.content).toBe(
      "## Updated",
    );
    expect(
      (
        await h.app.request(`${base}/${secondPageId}`, {
          method: "DELETE",
          headers: authHeaders(memberToken),
        })
      ).status,
    ).toBe(200);
    expect(
      (await h.app.request(`${base}/${secondPageId}`, { headers: authHeaders(memberToken) }))
        .status,
    ).toBe(404);
  });

  it("requires authentication and project membership for every operation", async () => {
    const base = `/api/wiki/${projectId}`;
    expect((await h.app.request(base)).status).toBe(401);
    expect((await h.app.request(base, { headers: authHeaders(outsiderToken) })).status).toBe(403);
    expect(
      (
        await h.app.request(base, {
          method: "POST",
          headers: authHeaders(outsiderToken),
          body: JSON.stringify({ title: "Nope" }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await h.app.request(`/api/wiki/${projectId}/nonsense`, {
          headers: authHeaders(memberToken),
        })
      ).status,
    ).toBe(422);
  });
});

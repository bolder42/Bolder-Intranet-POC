import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authHeaders,
  registerUser,
  setupTestApp,
  type TestHarness,
} from "../../../test/helpers.js";

let h: TestHarness;
let leadToken: string;
let adminToken: string;
let outsiderToken: string;

const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  h = await setupTestApp();

  const lead = await registerUser(h.app, {
    email: "lead@bolder.local",
    password: "password123",
    name: "Lead",
    role: "tech_lead",
  });
  const admin = await registerUser(h.app, {
    email: "admin@bolder.local",
    password: "password123",
    name: "Admin",
    role: "admin",
  });
  const outsider = await registerUser(h.app, {
    email: "outsider@bolder.local",
    password: "password123",
    name: "Outsider",
    role: "dev",
  });
  leadToken = lead.token;
  adminToken = admin.token;
  outsiderToken = outsider.token;

  const now = Date.now();
  const {
    projects,
    projectMembers,
    tasks,
    wikiPages,
    scheduleItems,
  } = h.mod;

  const projectA = h.db
    .insert(projects)
    .values({ name: "Apollo", createdBy: lead.user.id, createdAt: now })
    .returning()
    .get();
  const projectB = h.db
    .insert(projects)
    .values({ name: "Bolder", createdBy: admin.user.id, createdAt: now })
    .returning()
    .get();

  h.db
    .insert(projectMembers)
    .values([
      { projectId: projectA.id, userId: lead.user.id, joinedAt: now },
      { projectId: projectB.id, userId: admin.user.id, joinedAt: now },
    ])
    .run();

  h.db
    .insert(tasks)
    .values([
      {
        projectId: projectA.id,
        title: "overdue",
        status: "todo",
        dueAt: now - DAY,
        createdAt: now,
      },
      {
        projectId: projectA.id,
        title: "future",
        status: "todo",
        dueAt: now + DAY,
        createdAt: now,
      },
      {
        projectId: projectB.id,
        title: "done",
        status: "done",
        dueAt: now - DAY,
        createdAt: now,
      },
    ])
    .run();

  h.db
    .insert(wikiPages)
    .values([
      {
        projectId: projectA.id,
        title: "A wiki",
        content: "",
        authorId: lead.user.id,
        updatedAt: now,
      },
      {
        projectId: projectB.id,
        title: "B wiki",
        content: "",
        authorId: admin.user.id,
        updatedAt: now - DAY,
      },
    ])
    .run();

  h.db
    .insert(scheduleItems)
    .values([
      {
        projectId: projectA.id,
        title: "A deadline",
        kind: "deadline",
        dueAt: now + DAY,
      },
      {
        projectId: projectB.id,
        title: "B deadline",
        kind: "milestone",
        dueAt: now + 2 * DAY,
      },
    ])
    .run();
});

afterEach(() => {
  h.cleanup();
});

async function summary(token: string) {
  const res = await h.app.request("/api/home/summary", {
    headers: authHeaders(token),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as {
    projectCount: number;
    taskCount: number;
    overdueTaskCount: number;
    recentWiki: unknown[];
    upcomingDeadlines: unknown[];
  };
}

describe("home module (read-only projection)", () => {
  it("scopes the projection to the tech_lead's projects", async () => {
    const body = await summary(leadToken);
    expect(body.projectCount).toBe(1);
    expect(body.taskCount).toBe(2);
    expect(body.overdueTaskCount).toBe(1);
    expect(body.recentWiki).toHaveLength(1);
    expect(body.upcomingDeadlines).toHaveLength(1);
  });

  it("gives admins the global projection", async () => {
    const body = await summary(adminToken);
    expect(body.projectCount).toBe(2);
    expect(body.taskCount).toBe(3);
    expect(body.overdueTaskCount).toBe(1);
    expect(body.recentWiki).toHaveLength(2);
    expect(body.upcomingDeadlines).toHaveLength(2);
  });

  it("returns an empty projection for a user with no projects", async () => {
    const body = await summary(outsiderToken);
    expect(body).toEqual({
      projectCount: 0,
      taskCount: 0,
      overdueTaskCount: 0,
      recentWiki: [],
      upcomingDeadlines: [],
    });
  });

  it("requires authentication", async () => {
    const res = await h.app.request("/api/home/summary");
    expect(res.status).toBe(401);
  });
});

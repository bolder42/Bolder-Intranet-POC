import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { HomePerformance } from "@bolder/shared";
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

  const lead = await registerUser(h, {
    email: "lead@bolder.local",
    password: "password123",
    name: "Lead",
    role: "tech_lead",
  });
  const admin = await registerUser(h, {
    email: "admin@bolder.local",
    password: "password123",
    name: "Admin",
    role: "admin",
  });
  const outsider = await registerUser(h, {
    email: "outsider@bolder.local",
    password: "password123",
    name: "Outsider",
    role: "dev",
  });
  leadToken = lead.token;
  adminToken = admin.token;
  outsiderToken = outsider.token;

  const now = Date.now();
  const { projects, projectMembers, tasks, wikiPages, scheduleItems } = h.mod;

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
  async function performance(token: string) {
    const response = await h.app.request("/api/home/performance", { headers: authHeaders(token) });
    expect(response.status).toBe(200);
    return (await response.json()) as HomePerformance;
  }

  it("shows only participating projects to Tech Leads, with real workload counts", async () => {
    const body = await performance(leadToken);
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]).toMatchObject({
      name: "Apollo",
      status: "at_risk",
      total: 2,
      done: 0,
      overdue: 1,
      progress: 0,
      unassigned: 2,
    });
    expect(body.projects[0]?.members).toEqual([
      expect.objectContaining({ name: "Lead", assigned: 0, done: 0 }),
    ]);
    expect(JSON.stringify(body)).not.toContain("password");
  });

  it("shows Admins every project and a completed project has no overdue tasks", async () => {
    const body = await performance(adminToken);
    expect(body.projects).toHaveLength(2);
    expect(body.projects.find((project) => project.name === "Bolder")).toMatchObject({
      status: "completed",
      progress: 100,
      overdue: 0,
    });
  });

  it("derives team performance from assignment and reflects status changes", async () => {
    const body = await performance(leadToken);
    const projectId = body.projects[0]!.id;
    const memberId = body.projects[0]!.members[0]!.id;
    const task = h.db
      .select()
      .from(h.mod.tasks)
      .all()
      .find((item) => item.projectId === projectId)!;
    const update = await h.app.request(`/api/tasks/${projectId}/${task.id}`, {
      method: "PATCH",
      headers: { ...authHeaders(leadToken), "content-type": "application/json" },
      body: JSON.stringify({ assigneeId: memberId }),
    });
    expect(update.status).toBe(200);
    const move = await h.app.request(`/api/tasks/${projectId}/${task.id}/status`, {
      method: "PATCH",
      headers: { ...authHeaders(leadToken), "content-type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    expect(move.status).toBe(200);
    const changed = (await performance(leadToken)).projects[0]!;
    expect(changed).toMatchObject({ progress: 50, done: 1, overdue: 0, status: "in_progress" });
    expect(changed.members[0]).toMatchObject({ assigned: 1, done: 1, overdue: 0 });
  });

  it("handles projects without tasks without dividing by zero", async () => {
    h.db.insert(h.mod.projects).values({ name: "Empty", createdAt: Date.now() }).run();
    expect(
      (await performance(adminToken)).projects.find((project) => project.name === "Empty"),
    ).toMatchObject({ progress: 0, total: 0, status: "not_started", members: [] });
  });

  it("denies Dev and unauthenticated access to leadership metrics", async () => {
    expect(
      (await h.app.request("/api/home/performance", { headers: authHeaders(outsiderToken) }))
        .status,
    ).toBe(403);
    expect((await h.app.request("/api/home/performance")).status).toBe(401);
  });
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

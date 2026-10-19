import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authHeaders,
  registerUser,
  setupTestApp,
  type TestHarness,
} from "../../../test/helpers.js";

let h: TestHarness;
let memberToken: string;
let otherMemberToken: string;
let adminToken: string;
let outsiderToken: string;
let projectId: number;

interface TaskEvent {
  id: number;
  taskId: number;
  projectId: number;
  fromStatus: string | null;
  toStatus: string;
  changedById: number | null;
  changedAt: number;
}

interface TaskItem {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: number | null;
  dueAt: number | null;
  createdAt: number;
  assignee: { id: number; name: string; email: string; role: string } | null;
}

beforeEach(async () => {
  h = await setupTestApp();

  const lead = await registerUser(h.app, {
    email: "lead@bolder.local",
    password: "password123",
    name: "Lead",
    role: "tech_lead",
  });
  const otherLead = await registerUser(h.app, {
    email: "other@bolder.local",
    password: "password123",
    name: "Other",
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

  memberToken = lead.token;
  otherMemberToken = otherLead.token;
  adminToken = admin.token;
  outsiderToken = outsider.token;

  const { projects, projectMembers } = h.mod;
  const now = Date.now();
  const project = h.db
    .insert(projects)
    .values({ name: "Apollo", createdBy: lead.user.id, createdAt: now })
    .returning()
    .get();
  projectId = project.id;
  h.db
    .insert(projectMembers)
    .values([
      { projectId, userId: lead.user.id, joinedAt: now },
      { projectId, userId: otherLead.user.id, joinedAt: now },
    ])
    .run();
});

afterEach(() => {
  h.cleanup();
});

const DAY = 24 * 60 * 60 * 1000;

async function listTasks(token: string, id = projectId) {
  const res = await h.app.request(`/api/tasks/${id}`, { headers: authHeaders(token) });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { tasks: TaskItem[] };
  return body.tasks;
}

async function eventsOf(token: string, taskId: number, id = projectId) {
  const res = await h.app.request(`/api/tasks/${id}/${taskId}/events`, {
    headers: authHeaders(token),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { events: TaskEvent[] };
  return body.events;
}

describe("tasks module", () => {
  it("lists the project's tasks for a member, hides them from a non-member and lets an admin override", async () => {
    await h.app.request(`/api/tasks/${projectId}`, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "One" }),
    });
    await h.app.request(`/api/tasks/${projectId}`, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Two" }),
    });

    const tasks = await listTasks(memberToken);
    expect(tasks.map((task) => task.title)).toEqual(["One", "Two"]);
    // TaskListItem exposes the public assignee shape, never the password hash.
    expect(tasks[0]?.assignee).toBeNull();

    const forbidden = await h.app.request(`/api/tasks/${projectId}`, {
      headers: authHeaders(outsiderToken),
    });
    expect(forbidden.status).toBe(403);

    const asAdmin = await listTasks(adminToken);
    expect(asAdmin.map((task) => task.title)).toEqual(["One", "Two"]);
  });

  it("returns 404 for a task that does not belong to the project", async () => {
    const other = await registerUser(h.app, {
      email: "elsewhere@bolder.local",
      password: "password123",
      name: "Elsewhere",
      role: "tech_lead",
    });
    const { projects, projectMembers } = h.mod;
    const otherProject = h.db
      .insert(projects)
      .values({ name: "Other", createdBy: other.user.id, createdAt: Date.now() })
      .returning()
      .get();
    h.db
      .insert(projectMembers)
      .values({ projectId: otherProject.id, userId: other.user.id, joinedAt: Date.now() })
      .run();

    const created = (await (
      await h.app.request(`/api/tasks/${otherProject.id}`, {
        method: "POST",
        headers: authHeaders(other.token),
        body: JSON.stringify({ title: "Foreign" }),
      })
    ).json()) as { task: TaskItem };

    // Scoped by project: the very same task id is 404 under Apollo. The
    // contract has no GET /:projectId/:taskId, so PATCH/DELETE prove it.
    const patched = await h.app.request(`/api/tasks/${projectId}/${created.task.id}`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Hijack" }),
    });
    expect(patched.status).toBe(404);
    expect(((await patched.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
    const removed = await h.app.request(`/api/tasks/${projectId}/${created.task.id}`, {
      method: "DELETE",
      headers: authHeaders(memberToken),
    });
    expect(removed.status).toBe(404);
    const events = await h.app.request(`/api/tasks/${projectId}/${created.task.id}/events`, {
      headers: authHeaders(memberToken),
    });
    expect(events.status).toBe(404);
    expect(((await events.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
    expect(await eventsOf(other.token, created.task.id, otherProject.id)).toHaveLength(1);
  });

  it("writes exactly one creation event when a task is created", async () => {
    const res = await h.app.request(`/api/tasks/${projectId}`, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Born as done", status: "done" }),
    });
    expect(res.status).toBe(201);
    const { task } = (await res.json()) as { task: TaskItem };
    expect(task.status).toBe("done");
    expect(task.description).toBeNull();

    const events = await eventsOf(memberToken, task.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.fromStatus).toBeNull();
    expect(events[0]?.toStatus).toBe("done");
    expect(events[0]?.taskId).toBe(task.id);
    expect(events[0]?.projectId).toBe(projectId);
    expect(events[0]?.changedById).not.toBeNull();
    expect(events[0]?.changedAt).toBeGreaterThan(0);
  });

  it("defaults new tasks to todo and still records the creation event", async () => {
    const res = await h.app.request(`/api/tasks/${projectId}`, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Plain" }),
    });
    const { task } = (await res.json()) as { task: TaskItem };
    expect(task.status).toBe("todo");
    const events = await eventsOf(memberToken, task.id);
    expect(events).toEqual([expect.objectContaining({ fromStatus: null, toStatus: "todo" })]);
  });

  it("defaults new tasks to priority medium and honors an explicit priority", async () => {
    const omitted = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "No priority" }),
      })
    ).json()) as { task: TaskItem };
    expect(omitted.task.priority).toBe("medium");

    for (const priority of ["low", "high"] as const) {
      const res = await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: `Priority ${priority}`, priority }),
      });
      expect(res.status).toBe(201);
      const { task } = (await res.json()) as { task: TaskItem };
      expect(task.priority).toBe(priority);
      // The list endpoint carries priority along with every other task field.
      const listed = (await listTasks(memberToken)).find((item) => item.id === task.id);
      expect(listed?.priority).toBe(priority);
    }

    const rejected = await h.app.request(`/api/tasks/${projectId}`, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Bad priority", priority: "urgent" }),
    });
    expect(rejected.status).toBe(422);
  });

  it("updates priority through PATCH and leaves it untouched when omitted", async () => {
    const { task } = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "Reprioritizable", priority: "low" }),
      })
    ).json()) as { task: TaskItem };
    expect(task.priority).toBe("low");

    const patched = await h.app.request(`/api/tasks/${projectId}/${task.id}`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ priority: "high" }),
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { task: TaskItem }).task.priority).toBe("high");

    // A PATCH that omits priority leaves it unchanged.
    const renamed = await h.app.request(`/api/tasks/${projectId}/${task.id}`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Renamed again" }),
    });
    expect(renamed.status).toBe(200);
    const updated = ((await renamed.json()) as { task: TaskItem }).task;
    expect(updated.title).toBe("Renamed again");
    expect(updated.priority).toBe("high");
  });

  it("moves a card to backlog and records the transition", async () => {
    const { task } = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "Demoted" }),
      })
    ).json()) as { task: TaskItem };

    const moved = await h.app.request(`/api/tasks/${projectId}/${task.id}/status`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ status: "backlog" }),
    });
    expect(moved.status).toBe(200);
    expect(((await moved.json()) as { task: TaskItem }).task.status).toBe("backlog");

    const events = await eventsOf(memberToken, task.id);
    expect(events.map((event) => [event.fromStatus, event.toStatus])).toEqual([
      [null, "todo"],
      ["todo", "backlog"],
    ]);
  });

  it("creates a task directly in backlog", async () => {
    const res = await h.app.request(`/api/tasks/${projectId}`, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "Born in backlog", status: "backlog", priority: "high" }),
    });
    expect(res.status).toBe(201);
    const { task } = (await res.json()) as { task: TaskItem };
    expect(task.status).toBe("backlog");
    const events = await eventsOf(memberToken, task.id);
    expect(events).toEqual([expect.objectContaining({ fromStatus: null, toStatus: "backlog" })]);
  });

  it("updates fields and clears assignee and due date with explicit null", async () => {
    const other = await registerUser(h.app, {
      email: "assignee@bolder.local",
      password: "password123",
      name: "Assignee",
      role: "dev",
    });
    h.db
      .insert(h.mod.projectMembers)
      .values({ projectId, userId: other.user.id, joinedAt: Date.now() })
      .run();

    const { task } = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "Editable" }),
      })
    ).json()) as { task: TaskItem };

    const patched = await h.app.request(`/api/tasks/${projectId}/${task.id}`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({
        title: "Renamed",
        description: "Now described",
        assigneeId: other.user.id,
        dueAt: Date.now() + DAY,
      }),
    });
    expect(patched.status).toBe(200);
    const updated = ((await patched.json()) as { task: TaskItem }).task;
    expect(updated.title).toBe("Renamed");
    expect(updated.description).toBe("Now described");
    expect(updated.assigneeId).toBe(other.user.id);
    expect(updated.assignee?.email).toBe("assignee@bolder.local");
    expect(updated.assignee?.role).toBe("dev");
    expect(updated.dueAt).not.toBeNull();
    expect(updated.status).toBe("todo");

    const cleared = await h.app.request(`/api/tasks/${projectId}/${task.id}`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ assigneeId: null, dueAt: null, description: null }),
    });
    expect(cleared.status).toBe(200);
    const clearedTask = ((await cleared.json()) as { task: TaskItem }).task;
    expect(clearedTask.assigneeId).toBeNull();
    expect(clearedTask.assignee).toBeNull();
    expect(clearedTask.dueAt).toBeNull();
    expect(clearedTask.description).toBeNull();
    // PATCH cannot change status — that goes through the move endpoint only.
    expect(clearedTask.status).toBe("todo");
  });

  it("rejects assigning someone who is not a project member", async () => {
    const outsiderUser = await registerUser(h.app, {
      email: "stranger@bolder.local",
      password: "password123",
      name: "Stranger",
      role: "dev",
    });
    const { task } = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "Bad assignee" }),
      })
    ).json()) as { task: TaskItem };

    const onUpdate = await h.app.request(`/api/tasks/${projectId}/${task.id}`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ assigneeId: outsiderUser.user.id }),
    });
    expect(onUpdate.status).toBe(400);
    expect(((await onUpdate.json()) as { error: { code: string } }).error.code).toBe("VALIDATION");

    const onUpdateAgain = await h.app.request(`/api/tasks/${projectId}/${task.id}`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ assigneeId: outsiderUser.user.id, title: "x" }),
    });
    expect(onUpdateAgain.status).toBe(400);
  });

  it("writes exactly one event per real move and none for a same-status move", async () => {
    const { task } = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "Movable" }),
      })
    ).json()) as { task: TaskItem };
    expect(await eventsOf(memberToken, task.id)).toHaveLength(1);

    const move = await h.app.request(`/api/tasks/${projectId}/${task.id}/status`, {
      method: "PATCH",
      headers: authHeaders(otherMemberToken),
      body: JSON.stringify({ status: "doing" }),
    });
    expect(move.status).toBe(200);
    const moved = ((await move.json()) as { task: TaskItem }).task;
    expect(moved.status).toBe("doing");

    const events = await eventsOf(memberToken, task.id);
    expect(events).toHaveLength(2);
    expect(events.map((event) => [event.fromStatus, event.toStatus])).toEqual([
      [null, "todo"],
      ["todo", "doing"],
    ]);

    // Same status → no new event, task returned unchanged.
    const noop = await h.app.request(`/api/tasks/${projectId}/${task.id}/status`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ status: "doing" }),
    });
    expect(noop.status).toBe(200);
    expect(((await noop.json()) as { task: TaskItem }).task.status).toBe("doing");
    expect(await eventsOf(memberToken, task.id)).toHaveLength(2);
  });

  it("orders the event trail by changedAt ascending", async () => {
    const { task } = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "History" }),
      })
    ).json()) as { task: TaskItem };
    for (const status of ["doing", "done"]) {
      const res = await h.app.request(`/api/tasks/${projectId}/${task.id}/status`, {
        method: "PATCH",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ status }),
      });
      expect(res.status).toBe(200);
    }

    const events = await eventsOf(memberToken, task.id);
    expect(events.map((event) => event.toStatus)).toEqual(["todo", "doing", "done"]);
    expect(events.map((event) => event.fromStatus)).toEqual([null, "todo", "doing"]);
    const timestamps = events.map((event) => event.changedAt);
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
  });

  it("deletes a task together with its events (cascade)", async () => {
    const { task } = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "Doomed" }),
      })
    ).json()) as { task: TaskItem };
    await h.app.request(`/api/tasks/${projectId}/${task.id}/status`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ status: "done" }),
    });
    expect(await eventsOf(memberToken, task.id)).toHaveLength(2);

    const res = await h.app.request(`/api/tasks/${projectId}/${task.id}`, {
      method: "DELETE",
      headers: authHeaders(memberToken),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect((await listTasks(memberToken)).map((item) => item.id)).not.toContain(task.id);

    const { taskStatusEvents } = h.mod;
    expect(
      h.db
        .select()
        .from(taskStatusEvents)
        .all()
        .filter((event) => event.taskId === task.id),
    ).toHaveLength(0);
  });

  it("requires membership for every mutating route and for the events route", async () => {
    const { task } = (await (
      await h.app.request(`/api/tasks/${projectId}`, {
        method: "POST",
        headers: authHeaders(memberToken),
        body: JSON.stringify({ title: "Guarded" }),
      })
    ).json()) as { task: TaskItem };

    const cases: Array<[string, RequestInit]> = [
      [`/api/tasks/${projectId}`, { method: "GET" }],
      [`/api/tasks/${projectId}/${task.id}`, { method: "DELETE" }],
      [`/api/tasks/${projectId}/${task.id}`, { method: "PATCH", body: JSON.stringify({}) }],
      [
        `/api/tasks/${projectId}/${task.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: "done" }) },
      ],
    ];
    for (const [path, init] of cases) {
      const res = await h.app.request(path, {
        ...init,
        headers: authHeaders(outsiderToken),
      });
      expect(res.status).toBe(403);
    }
    const events = await h.app.request(`/api/tasks/${projectId}/${task.id}/events`, {
      headers: authHeaders(outsiderToken),
    });
    expect(events.status).toBe(403);
  });

  it("rejects invalid payloads through the zod error hook", async () => {
    const empty = await h.app.request(`/api/tasks/${projectId}`, {
      method: "POST",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ title: "" }),
    });
    expect(empty.status).toBe(422);

    const badStatus = await h.app.request(`/api/tasks/${projectId}/1/status`, {
      method: "PATCH",
      headers: authHeaders(memberToken),
      body: JSON.stringify({ status: "blocked" }),
    });
    expect(badStatus.status).toBe(422);
    expect(((await badStatus.json()) as { error: { code: string } }).error.code).toBe("VALIDATION");
  });
});

import {
  getDb,
  projectMembers,
  projects,
  runMigrations,
  scheduleItems,
  taskStatusEvents,
  tasks,
  users,
  wikiPages,
} from "@bolder/db";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import type { TaskPriority, TaskStatus } from "@bolder/shared";

/**
 * Idempotent seed for local development.
 * Run with: `pnpm --filter @bolder/api seed`
 */
const db = getDb();
runMigrations(db);

// --- reset (idempotency) ---------------------------------------------------
// Delete children before parents to satisfy foreign keys.
db.delete(scheduleItems).run();
db.delete(wikiPages).run();
db.delete(taskStatusEvents).run();
db.delete(tasks).run();
db.delete(projectMembers).run();
db.delete(projects).run();
db.delete(users).run();

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

// --- users -----------------------------------------------------------------
const admin = db
  .insert(users)
  .values({
    email: "admin@bolder.local",
    passwordHash: hashPassword("admin123"),
    name: "Ada Admin",
    role: "admin",
  })
  .returning()
  .get();

const tech = db
  .insert(users)
  .values({
    email: "tech@bolder.local",
    passwordHash: hashPassword("tech1234"),
    name: "Téo Tech Lead",
    role: "tech_lead",
  })
  .returning()
  .get();

const dev1 = db
  .insert(users)
  .values({
    email: "dev1@bolder.local",
    passwordHash: hashPassword("dev12345"),
    name: "Duda Dev",
    role: "dev",
  })
  .returning()
  .get();

const dev2 = db
  .insert(users)
  .values({
    email: "dev2@bolder.local",
    passwordHash: hashPassword("dev12345"),
    name: "Dino Dev",
    role: "dev",
  })
  .returning()
  .get();

// --- projects --------------------------------------------------------------
const apollo = db
  .insert(projects)
  .values({
    name: "Apollo",
    description: "Internal landing page revamp.",
    createdBy: tech.id,
    createdAt: now,
  })
  .returning()
  .get();

const intranet = db
  .insert(projects)
  .values({
    name: "Bolder Intranet",
    description: "This very POC.",
    createdBy: admin.id,
    createdAt: now,
  })
  .returning()
  .get();

db.insert(projectMembers)
  .values([
    { projectId: apollo.id, userId: tech.id, joinedAt: now },
    { projectId: apollo.id, userId: dev1.id, joinedAt: now },
    { projectId: apollo.id, userId: dev2.id, joinedAt: now },
    { projectId: intranet.id, userId: admin.id, joinedAt: now },
    { projectId: intranet.id, userId: dev1.id, joinedAt: now },
  ])
  .run();

// --- tasks + status history -------------------------------------------------
/**
 * Every task carries the status trail it took to reach its current column,
 * with timestamps spread over the past days so cycle time can be analysed
 * right after seeding. `events` pairs with the task's own `createdAt`.
 */
type TaskSeed = {
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number | null;
  dueAt: number | null;
  createdAt: number;
  events: Array<{
    fromStatus: TaskStatus | null;
    toStatus: TaskStatus;
    changedById: number | null;
    changedAt: number;
  }>;
};

/** Builds the `created → … → current status` trail for a seeded task. */
function trail(
  createdAt: number,
  path: TaskStatus[],
  changedById: number | null,
  dayOffsets: number[],
) {
  return path.map((toStatus, index) => ({
    fromStatus: index === 0 ? null : path[index - 1]!,
    toStatus,
    changedById,
    changedAt: createdAt + (dayOffsets[index] ?? 0) * day,
  }));
}

const TASK_SEEDS: TaskSeed[] = [
  // --- Apollo ---
  {
    projectId: apollo.id,
    title: "Design hero section",
    description: "Figma first.",
    status: "doing",
    priority: "high",
    assigneeId: dev1.id,
    dueAt: now + 2 * day,
    createdAt: now - 9 * day,
    events: trail(now - 9 * day, ["todo", "doing"], dev1.id, [0, 1]),
  },
  {
    projectId: apollo.id,
    title: "Set up analytics",
    description: null,
    status: "todo",
    priority: "medium",
    assigneeId: dev2.id,
    dueAt: now - day, // overdue
    createdAt: now - 6 * day,
    events: trail(now - 6 * day, ["todo"], dev2.id, [0]),
  },
  {
    projectId: apollo.id,
    title: "Ship v1",
    description: null,
    status: "done",
    priority: "high",
    assigneeId: tech.id,
    dueAt: now - 3 * day,
    createdAt: now - 14 * day,
    events: trail(now - 14 * day, ["todo", "doing", "done"], tech.id, [0, 2, 4]),
  },
  {
    projectId: apollo.id,
    title: "Write onboarding copy",
    description: "Short, friendly, no jargon.",
    status: "doing",
    priority: "low",
    assigneeId: null,
    dueAt: now + day,
    createdAt: now - 5 * day,
    events: trail(now - 5 * day, ["todo", "doing"], null, [0, 2]),
  },
  {
    projectId: apollo.id,
    title: "Review mobile breakpoints",
    description: null,
    status: "todo",
    priority: "medium",
    assigneeId: dev2.id,
    dueAt: now + 6 * day,
    createdAt: now - 2 * day,
    events: trail(now - 2 * day, ["todo"], dev2.id, [0]),
  },
  {
    projectId: apollo.id,
    title: "Fix contrast bugs",
    description: "Reported in the accessibility pass.",
    status: "done",
    priority: "medium",
    assigneeId: dev1.id,
    dueAt: now - 8 * day,
    createdAt: now - 11 * day,
    events: trail(now - 11 * day, ["todo", "doing", "done"], dev1.id, [0, 1, 2]),
  },
  {
    projectId: apollo.id,
    title: "Explore dark mode",
    description: "Spike a theme toggle before committing.",
    status: "backlog",
    priority: "low",
    assigneeId: null,
    dueAt: null,
    createdAt: now - 4 * day,
    events: trail(now - 4 * day, ["backlog"], null, [0]),
  },
  // --- Bolder Intranet ---
  {
    projectId: intranet.id,
    title: "Wire API client",
    description: "Typed Hono RPC end to end.",
    status: "todo",
    priority: "high",
    assigneeId: dev1.id,
    dueAt: now + 5 * day,
    createdAt: now - 2 * day,
    events: trail(now - 2 * day, ["todo"], dev1.id, [0]),
  },
  {
    projectId: intranet.id,
    title: "Set up CI pipeline",
    description: null,
    status: "doing",
    priority: "high",
    assigneeId: null,
    dueAt: now + 3 * day,
    createdAt: now - 7 * day,
    events: trail(now - 7 * day, ["todo", "doing"], null, [0, 1]),
  },
  {
    projectId: intranet.id,
    title: "Draft MODULES.md",
    description: "Module boundaries and access rules.",
    status: "done",
    priority: "medium",
    assigneeId: admin.id,
    dueAt: now - 6 * day,
    createdAt: now - 10 * day,
    events: trail(now - 10 * day, ["todo", "doing", "done"], admin.id, [0, 1, 3]),
  },
  {
    projectId: intranet.id,
    title: "Design kanban board",
    description: "Four columns now — Backlog included.",
    status: "doing",
    priority: "medium",
    assigneeId: dev1.id,
    dueAt: now + 4 * day,
    createdAt: now - 4 * day,
    events: trail(now - 4 * day, ["todo", "doing"], dev1.id, [0, 1]),
  },
  {
    projectId: intranet.id,
    title: "Write the seed script",
    description: null,
    status: "todo",
    priority: "low",
    assigneeId: null,
    dueAt: now + 9 * day,
    createdAt: now - day,
    events: trail(now - day, ["todo"], null, [0]),
  },
  {
    projectId: intranet.id,
    title: "Plan mobile polish pass",
    description: "Responsive review across the three shells.",
    status: "backlog",
    priority: "high",
    assigneeId: dev1.id,
    dueAt: null,
    createdAt: now - 3 * day,
    events: trail(now - 3 * day, ["backlog"], dev1.id, [0]),
  },
  {
    projectId: intranet.id,
    title: "Spike offline cache",
    description: null,
    status: "backlog",
    priority: "medium",
    assigneeId: null,
    dueAt: null,
    createdAt: now - day,
    events: trail(now - day, ["backlog"], null, [0]),
  },
];

for (const { events, ...task } of TASK_SEEDS) {
  const created = db.insert(tasks).values(task).returning().get();
  if (events.length > 0) {
    db.insert(taskStatusEvents)
      .values(events.map((event) => ({ ...event, taskId: created.id, projectId: created.projectId })))
      .run();
  }
}

// --- wiki ------------------------------------------------------------------
db.insert(wikiPages)
  .values([
    {
      projectId: apollo.id,
      title: "Onboarding",
      content: "Links and references for the Apollo project.",
      authorId: tech.id,
      updatedAt: now,
    },
    {
      projectId: intranet.id,
      title: "Architecture",
      content: "Single DB partitioned by project_id.",
      authorId: admin.id,
      updatedAt: now - day,
    },
  ])
  .run();

// --- schedule --------------------------------------------------------------
db.insert(scheduleItems)
  .values([
    {
      projectId: apollo.id,
      title: "Design review",
      kind: "milestone",
      dueAt: now + 3 * day,
      description: "Review the hero concepts.",
    },
    {
      projectId: apollo.id,
      title: "Launch",
      kind: "deadline",
      dueAt: now + 10 * day,
      description: "Public launch of Apollo.",
    },
    {
      projectId: intranet.id,
      title: "POC preview",
      kind: "deadline",
      dueAt: now + 7 * day,
      description: "Progress preview with the team.",
    },
  ])
  .run();

console.warn(
  `[seed] ok — users: 4, projects: ${apollo.name}, ${intranet.name} (admin/admin123)`,
);

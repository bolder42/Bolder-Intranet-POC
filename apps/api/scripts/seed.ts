import {
  getDb,
  projectMembers,
  projects,
  runMigrations,
  scheduleItems,
  tasks,
  users,
  wikiPages,
} from "@bolder/db";
import { hashPassword } from "../src/modules/auth/auth.service.js";

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
    { projectId: apollo.id, userId: tech.id, role: "lead", joinedAt: now },
    { projectId: apollo.id, userId: dev1.id, role: "member", joinedAt: now },
    { projectId: apollo.id, userId: dev2.id, role: "member", joinedAt: now },
    { projectId: intranet.id, userId: admin.id, role: "lead", joinedAt: now },
    { projectId: intranet.id, userId: dev1.id, role: "member", joinedAt: now },
  ])
  .run();

// --- tasks -----------------------------------------------------------------
db.insert(tasks)
  .values([
    {
      projectId: apollo.id,
      title: "Design hero section",
      description: "Figma first.",
      status: "doing",
      assigneeId: dev1.id,
      dueAt: now + 2 * day,
      createdAt: now,
    },
    {
      projectId: apollo.id,
      title: "Set up analytics",
      status: "todo",
      assigneeId: dev2.id,
      dueAt: now - day, // overdue
      createdAt: now,
    },
    {
      projectId: apollo.id,
      title: "Ship v1",
      status: "done",
      assigneeId: tech.id,
      dueAt: now - 3 * day,
      createdAt: now,
    },
    {
      projectId: intranet.id,
      title: "Wire API client",
      status: "todo",
      assigneeId: dev1.id,
      dueAt: now + 5 * day,
      createdAt: now,
    },
  ])
  .run();

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

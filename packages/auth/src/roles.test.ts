process.env.DATABASE_URL = ":memory:";

import { beforeAll, describe, expect, it } from "vitest";
import {
  getDb,
  projectMembers,
  projects,
  runMigrations,
  users,
} from "@bolder/db";
import { ApiError, hasAtLeastGlobal } from "@bolder/shared";
import {
  canWriteProject,
  requireGlobalRole,
  requireProjectLead,
  requireProjectMember,
} from "./roles.js";
import type { AuthContext, SessionUser } from "./session.js";

const db = getDb();
let projectId = 0;
let lead: SessionUser;
let member: SessionUser;
let outsider: SessionUser;
let admin: SessionUser;

function ctx(user: SessionUser): AuthContext {
  return { user };
}

beforeAll(() => {
  runMigrations(db);

  const adminRow = db
    .insert(users)
    .values({
      email: "admin@bolder.local",
      passwordHash: "x",
      name: "Admin",
      role: "admin",
    })
    .returning()
    .get();
  const leadRow = db
    .insert(users)
    .values({
      email: "lead@bolder.local",
      passwordHash: "x",
      name: "Lead",
      role: "dev",
    })
    .returning()
    .get();
  const memberRow = db
    .insert(users)
    .values({
      email: "member@bolder.local",
      passwordHash: "x",
      name: "Member",
      role: "dev",
    })
    .returning()
    .get();
  const outsiderRow = db
    .insert(users)
    .values({
      email: "outsider@bolder.local",
      passwordHash: "x",
      name: "Outsider",
      role: "dev",
    })
    .returning()
    .get();

  const projectRow = db
    .insert(projects)
    .values({ name: "Apollo", createdBy: leadRow.id })
    .returning()
    .get();
  projectId = projectRow.id;

  db.insert(projectMembers)
    .values([
      { projectId, userId: leadRow.id, role: "lead" },
      { projectId, userId: memberRow.id, role: "member" },
    ])
    .run();

  const toSession = (row: typeof adminRow): SessionUser => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  });

  admin = toSession(adminRow);
  lead = toSession(leadRow);
  member = toSession(memberRow);
  outsider = toSession(outsiderRow);
});

describe("hasAtLeastGlobal (re-exported from @bolder/shared)", () => {
  it("treats admin as passing everything", () => {
    expect(hasAtLeastGlobal("admin", "admin")).toBe(true);
    expect(hasAtLeastGlobal("dev", "tech_lead")).toBe(false);
  });
});

describe("requireGlobalRole", () => {
  it("allows a listed role", () => {
    expect(() => requireGlobalRole(ctx(lead), ["dev"])).not.toThrow();
  });

  it("allows admin even when not listed", () => {
    expect(() => requireGlobalRole(ctx(admin), ["tech_lead"])).not.toThrow();
  });

  it("throws FORBIDDEN for a disallowed role", () => {
    try {
      requireGlobalRole(ctx(member), ["admin"]);
      throw new Error("expected to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });
});

describe("requireProjectLead", () => {
  it("allows the project lead", () => {
    expect(() => requireProjectLead(ctx(lead), projectId)).not.toThrow();
  });

  it("allows a global admin", () => {
    expect(() => requireProjectLead(ctx(admin), projectId)).not.toThrow();
  });

  it("rejects a regular member", () => {
    expect(() => requireProjectLead(ctx(member), projectId)).toThrow(ApiError);
  });

  it("rejects an outsider", () => {
    expect(() => requireProjectLead(ctx(outsider), projectId)).toThrow(ApiError);
  });
});

describe("requireProjectMember", () => {
  it("allows members and the lead", () => {
    expect(() => requireProjectMember(ctx(lead), projectId)).not.toThrow();
    expect(() => requireProjectMember(ctx(member), projectId)).not.toThrow();
  });

  it("rejects an outsider", () => {
    expect(() => requireProjectMember(ctx(outsider), projectId)).toThrow(
      ApiError,
    );
  });

  it("allows a global admin", () => {
    expect(() => requireProjectMember(ctx(admin), projectId)).not.toThrow();
  });
});

describe("canWriteProject", () => {
  it("is true for the lead and admin, false otherwise", () => {
    expect(canWriteProject(lead, projectId)).toBe(true);
    expect(canWriteProject(admin, projectId)).toBe(true);
    expect(canWriteProject(member, projectId)).toBe(false);
    expect(canWriteProject(outsider, projectId)).toBe(false);
  });
});

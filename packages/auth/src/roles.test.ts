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
  requireProjectMember,
} from "./roles.js";
import type { AuthContext, SessionUser } from "./session.js";

const db = getDb();
let projectId = 0;
let tech: SessionUser;
let dev: SessionUser;
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
  const techRow = db
    .insert(users)
    .values({
      email: "tech@bolder.local",
      passwordHash: "x",
      name: "Tech",
      role: "tech_lead",
    })
    .returning()
    .get();
  const devRow = db
    .insert(users)
    .values({
      email: "dev@bolder.local",
      passwordHash: "x",
      name: "Dev",
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
    .values({ name: "Apollo", createdBy: techRow.id })
    .returning()
    .get();
  projectId = projectRow.id;

  db.insert(projectMembers)
    .values([
      { projectId, userId: techRow.id },
      { projectId, userId: devRow.id },
    ])
    .run();

  const toSession = (row: typeof adminRow): SessionUser => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  });

  admin = toSession(adminRow);
  tech = toSession(techRow);
  dev = toSession(devRow);
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
    expect(() => requireGlobalRole(ctx(tech), ["tech_lead"])).not.toThrow();
  });

  it("allows admin even when not listed", () => {
    expect(() => requireGlobalRole(ctx(admin), ["tech_lead"])).not.toThrow();
  });

  it("throws FORBIDDEN for a disallowed role", () => {
    try {
      requireGlobalRole(ctx(dev), ["admin"]);
      throw new Error("expected to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });
});

describe("requireProjectMember", () => {
  it("allows project members", () => {
    expect(() => requireProjectMember(ctx(tech), projectId)).not.toThrow();
    expect(() => requireProjectMember(ctx(dev), projectId)).not.toThrow();
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
  it("is true for tech_lead and admin, false for dev", () => {
    expect(canWriteProject(tech)).toBe(true);
    expect(canWriteProject(admin)).toBe(true);
    expect(canWriteProject(dev)).toBe(false);
  });
});
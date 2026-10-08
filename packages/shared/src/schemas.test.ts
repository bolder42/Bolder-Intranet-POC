import { describe, expect, it } from "vitest";
import { LoginSchema, RegisterSchema, UserPublicSchema } from "./auth.js";
import { HomeSummarySchema } from "./home.js";
import { CreateProjectSchema, UpdateProjectSchema } from "./projects.js";
import { CreateTaskSchema } from "./tasks.js";

describe("auth schemas", () => {
  it("validates a login payload", () => {
    expect(LoginSchema.safeParse({ email: "a@b.co", password: "12345678" }).success).toBe(true);
    expect(LoginSchema.safeParse({ email: "nope", password: "short" }).success).toBe(false);
  });

  it("defaults register role to dev", () => {
    const parsed = RegisterSchema.parse({
      email: "dev@bolder.local",
      password: "password123",
      name: "Dev",
    });
    expect(parsed.role).toBe("dev");
  });

  it("rejects a public user without a known role", () => {
    expect(
      UserPublicSchema.safeParse({ id: 1, name: "x", email: "x@y.co", role: "owner" })
        .success,
    ).toBe(false);
  });
});

describe("project schemas", () => {
  it("requires a non-empty name", () => {
    expect(CreateProjectSchema.safeParse({ name: "" }).success).toBe(false);
    expect(CreateProjectSchema.safeParse({ name: "Apollo" }).success).toBe(true);
  });

  it("allows partial updates", () => {
    expect(UpdateProjectSchema.safeParse({}).success).toBe(true);
  });
});

describe("task schemas", () => {
  it("defaults status to todo", () => {
    expect(CreateTaskSchema.parse({ title: "ship it" }).status).toBe("todo");
  });
});

describe("HomeSummarySchema", () => {
  it("accepts an empty projection and rejects malformed data", () => {
    const valid = {
      projectCount: 1,
      taskCount: 2,
      overdueTaskCount: 0,
      recentWiki: [],
      upcomingDeadlines: [],
    };
    expect(HomeSummarySchema.safeParse(valid).success).toBe(true);
    expect(HomeSummarySchema.safeParse({ ...valid, projectCount: "many" }).success).toBe(
      false,
    );
  });
});

import { describe, expect, it } from "vitest";
import { LoginSchema, RegisterSchema, UserPublicSchema } from "./auth.js";
import { HomeSummarySchema } from "./home.js";
import { CreateProjectSchema, UpdateProjectSchema } from "./projects.js";
import {
  CreateTaskSchema,
  MoveTaskSchema,
  TaskStatusSchema,
  UpdateTaskSchema,
} from "./tasks.js";
import { UpdateMeSchema, UserProfileSchema } from "./users.js";

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

  it("defaults priority to medium", () => {
    expect(CreateTaskSchema.parse({ title: "ship it" }).priority).toBe("medium");
  });

  it("accepts explicit priorities", () => {
    expect(CreateTaskSchema.parse({ title: "ship it", priority: "low" }).priority).toBe("low");
    expect(CreateTaskSchema.parse({ title: "ship it", priority: "high" }).priority).toBe("high");
  });

  it("rejects an unknown priority", () => {
    expect(
      CreateTaskSchema.safeParse({ title: "ship it", priority: "urgent" }).success,
    ).toBe(false);
  });

  it("accepts backlog as a status", () => {
    expect(TaskStatusSchema.parse("backlog")).toBe("backlog");
  });

  it("rejects an unknown status", () => {
    expect(TaskStatusSchema.safeParse("blocked").success).toBe(false);
  });

  it("allows priority as a partial update but leaves it undefined when omitted", () => {
    const withPriority = UpdateTaskSchema.parse({ priority: "high" });
    expect(withPriority.priority).toBe("high");
    expect(UpdateTaskSchema.parse({}).priority).toBeUndefined();
  });

  it("accepts backlog as a move target", () => {
    expect(MoveTaskSchema.parse({ status: "backlog" }).status).toBe("backlog");
  });
});

describe("user profile schemas", () => {
  it("accepts a full profile including a null image", () => {
    expect(
      UserProfileSchema.safeParse({
        id: 1,
        email: "ada@bolder.local",
        name: "Ada",
        role: "dev",
        image: null,
      }).success,
    ).toBe(true);
  });

  it("allows partial updates", () => {
    expect(UpdateMeSchema.safeParse({}).success).toBe(true);
    expect(UpdateMeSchema.parse({ name: "  Ada  " }).name).toBe("Ada");
    expect(UpdateMeSchema.parse({ image: "" }).image).toBe("");
  });

  it("rejects empty or oversized names", () => {
    expect(UpdateMeSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(UpdateMeSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
  });

  it("rejects non-http image URLs, including script schemes", () => {
    expect(UpdateMeSchema.safeParse({ image: "https://x.co/a.png" }).success).toBe(true);
    expect(UpdateMeSchema.safeParse({ image: "javascript:alert(1)" }).success).toBe(false);
    expect(UpdateMeSchema.safeParse({ image: "data:text/html,x" }).success).toBe(false);
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

import { describe, expect, it } from "vitest";
import { hasAtLeastGlobal, ROLE_RANK, RoleSchema } from "./roles.js";

describe("RoleSchema", () => {
  it("accepts the three POC roles", () => {
    expect(RoleSchema.parse("dev")).toBe("dev");
    expect(RoleSchema.parse("tech_lead")).toBe("tech_lead");
    expect(RoleSchema.parse("admin")).toBe("admin");
  });

  it("rejects unknown roles", () => {
    expect(() => RoleSchema.parse("owner")).toThrow();
  });
});

describe("ROLE_RANK", () => {
  it("orders roles dev < tech_lead < admin", () => {
    expect(ROLE_RANK.dev).toBeLessThan(ROLE_RANK.tech_lead);
    expect(ROLE_RANK.tech_lead).toBeLessThan(ROLE_RANK.admin);
  });
});

describe("hasAtLeastGlobal", () => {
  it("lets a role satisfy its own or lower requirements", () => {
    expect(hasAtLeastGlobal("tech_lead", "dev")).toBe(true);
    expect(hasAtLeastGlobal("tech_lead", "tech_lead")).toBe(true);
    expect(hasAtLeastGlobal("dev", "tech_lead")).toBe(false);
  });

  it("lets admin pass every requirement", () => {
    expect(hasAtLeastGlobal("admin", "dev")).toBe(true);
    expect(hasAtLeastGlobal("admin", "tech_lead")).toBe(true);
    expect(hasAtLeastGlobal("admin", "admin")).toBe(true);
  });
});

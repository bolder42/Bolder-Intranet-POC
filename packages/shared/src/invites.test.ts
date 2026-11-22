import { describe, expect, it } from "vitest";
import {
  CreateInviteSchema,
  InviteListSchema,
  InviteSchema,
  InviteValidationSchema,
  ValidateInviteSchema,
  getInviteStatus,
  isInviteRedeemable,
} from "./invites.js";

const NOW = 1_700_000_000_000;

const base = {
  revokedAt: null,
  usedAt: null,
  expiresAt: NOW + 60_000,
};

describe("getInviteStatus", () => {
  it("returns active for a live invite", () => {
    expect(getInviteStatus(base, NOW)).toBe("active");
  });

  it("returns expired when expiresAt is at or before now", () => {
    expect(getInviteStatus({ ...base, expiresAt: NOW }, NOW)).toBe("expired");
    expect(getInviteStatus({ ...base, expiresAt: NOW - 1 }, NOW)).toBe("expired");
  });

  it("prefers used over expired", () => {
    expect(getInviteStatus({ ...base, usedAt: NOW - 10 }, NOW)).toBe("used");
  });

  it("prefers revoked over used", () => {
    expect(getInviteStatus({ ...base, revokedAt: NOW - 5, usedAt: NOW - 10 }, NOW)).toBe("revoked");
    expect(getInviteStatus({ ...base, revokedAt: NOW - 5 }, NOW)).toBe("revoked");
  });
});

describe("isInviteRedeemable", () => {
  it("is true only while active", () => {
    expect(isInviteRedeemable(base, NOW)).toBe(true);
    expect(isInviteRedeemable({ ...base, usedAt: NOW - 1 }, NOW)).toBe(false);
    expect(isInviteRedeemable({ ...base, revokedAt: NOW - 1 }, NOW)).toBe(false);
    expect(isInviteRedeemable({ ...base, expiresAt: NOW - 1 }, NOW)).toBe(false);
  });
});

describe("invite schemas", () => {
  it("defaults create payload to dev / 7 days", () => {
    const parsed = CreateInviteSchema.parse({});
    expect(parsed.role).toBe("dev");
    expect(parsed.expiresInDays).toBe(7);
  });

  it("rejects out-of-range expiry and unknown roles", () => {
    expect(CreateInviteSchema.safeParse({ expiresInDays: 0 }).success).toBe(false);
    expect(CreateInviteSchema.safeParse({ expiresInDays: 366 }).success).toBe(false);
    expect(CreateInviteSchema.safeParse({ role: "owner" }).success).toBe(false);
  });

  it("trims the code on validation", () => {
    expect(ValidateInviteSchema.parse({ code: "  abc  " }).code).toBe("abc");
    expect(ValidateInviteSchema.safeParse({ code: "   " }).success).toBe(false);
  });

  it("accepts a full invite wire shape and rejects bad statuses", () => {
    const invite = {
      id: 1,
      code: "abc",
      role: "tech_lead",
      status: "active",
      createdBy: 2,
      createdAt: NOW,
      expiresAt: NOW + 1,
      revokedAt: null,
      usedAt: null,
      usedBy: null,
    };

    expect(InviteSchema.safeParse(invite).success).toBe(true);
    expect(InviteListSchema.safeParse({ invites: [invite] }).success).toBe(true);
    expect(InviteSchema.safeParse({ ...invite, status: "pending" }).success).toBe(false);
    expect(InviteListSchema.safeParse({ invites: "nope" }).success).toBe(false);
  });

  it("keeps the public validation result minimal", () => {
    expect(InviteValidationSchema.safeParse({ valid: true, role: "dev" }).success).toBe(true);
    expect(InviteValidationSchema.safeParse({ valid: false, reason: "expired" }).success).toBe(
      true,
    );
    expect(InviteValidationSchema.safeParse({ valid: false, reason: "banned" }).success).toBe(
      false,
    );
  });
});

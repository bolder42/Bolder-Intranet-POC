import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authHeaders,
  registerUser,
  seedInvite,
  setupTestApp,
  type TestHarness,
} from "../../../test/helpers.js";
import {
  generateInviteCode,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
} from "./invite-code.js";

let h: TestHarness;

beforeEach(async () => {
  h = await setupTestApp();
});

afterEach(() => {
  h.cleanup();
});

const JSON_HEADERS = { "content-type": "application/json" };
const DAY = 24 * 60 * 60 * 1000;

async function asAdmin(): Promise<string> {
  const { token } = await registerUser(h, {
    email: "admin@bolder.local",
    password: "password123",
    name: "Admin",
    role: "admin",
  });
  return token;
}

function createInviteRequest(token: string | undefined, body: unknown) {
  return h.app.request("/api/invites", {
    method: "POST",
    headers: token ? authHeaders(token) : JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

function registerWith(
  inviteCode: string,
  options: {
    email?: string;
    name?: string;
    password?: string;
    extra?: Record<string, unknown>;
  } = {},
) {
  return h.app.request("/api/auth/register", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      email: options.email ?? "invited@bolder.local",
      password: options.password ?? "password123",
      name: options.name ?? "Invited",
      inviteCode,
      ...options.extra,
    }),
  });
}

describe("invite code helpers", () => {
  it("generates unambiguous 8-char codes and normalizes user input", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      for (const char of code) expect(INVITE_CODE_ALPHABET).toContain(char);
      expect(code).not.toMatch(/[ILOU01]/);
    }
    expect(normalizeInviteCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(normalizeInviteCode("ABCD EFGH")).toBe("ABCDEFGH");
    expect(normalizeInviteCode("abcd/efgh")).toBe("ABCDEFGH");
  });
});

describe("invites module", () => {
  it("rejects unauthenticated creation with 401", async () => {
    const res = await createInviteRequest(undefined, { role: "dev" });
    expect(res.status).toBe(401);
  });

  it("forbids creation for devs and tech leads", async () => {
    const dev = await registerUser(h, {
      email: "dev@bolder.local",
      password: "password123",
      name: "Dev",
      role: "dev",
    });
    const tech = await registerUser(h, {
      email: "tech@bolder.local",
      password: "password123",
      name: "Tech",
      role: "tech_lead",
    });

    expect((await createInviteRequest(dev.token, { role: "admin" })).status).toBe(403);
    expect((await createInviteRequest(tech.token, { role: "admin" })).status).toBe(403);
  });

  it("creates an active invite with the requested role (admin only)", async () => {
    const token = await asAdmin();
    const res = await createInviteRequest(token, { role: "tech_lead", expiresInDays: 3 });
    expect(res.status).toBe(201);
    const { invite } = (await res.json()) as {
      invite: {
        code: string;
        role: string;
        status: string;
        createdBy: number;
        expiresAt: number;
      };
    };
    expect(invite.status).toBe("active");
    expect(invite.role).toBe("tech_lead");
    expect(typeof invite.code).toBe("string");
    expect(invite.code).toHaveLength(8);
    expect(invite.expiresAt).toBeGreaterThan(Date.now() + 2 * DAY);
  });

  it("defaults to the dev role and a 7-day expiry", async () => {
    const token = await asAdmin();
    const res = await createInviteRequest(token, {});
    expect(res.status).toBe(201);
    const { invite } = (await res.json()) as {
      invite: { role: string; createdAt: number; expiresAt: number };
    };
    expect(invite.role).toBe("dev");
    const ttl = invite.expiresAt - invite.createdAt;
    expect(ttl).toBeGreaterThan(7 * DAY - 60_000);
    expect(ttl).toBeLessThan(7 * DAY + 60_000);
  });

  it("closes the role-escalation hole: the invite role wins", async () => {
    const invite = seedInvite(h, { role: "dev" });
    const res = await registerWith(invite.code, {
      email: "escalate@bolder.local",
      extra: { role: "admin" },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { user: { role: string } };
    expect(body.user.role).toBe("dev");
  });

  it("honours the role minted on the invite", async () => {
    const invite = seedInvite(h, { role: "tech_lead" });
    const res = await registerWith(invite.code, { email: "lead@bolder.local" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { user: { role: string } };
    expect(body.user.role).toBe("tech_lead");
  });

  it("enforces single use (second registration → 409)", async () => {
    const invite = seedInvite(h);
    expect((await registerWith(invite.code, { email: "first@bolder.local" })).status).toBe(201);

    const second = await registerWith(invite.code, { email: "second@bolder.local" });
    expect(second.status).toBe(409);
  });

  it("rejects unknown, revoked, expired and missing codes", async () => {
    expect((await registerWith("ZZZZZZZZ")).status).toBe(422);

    const revoked = seedInvite(h);
    const admin = await asAdmin();
    expect(
      (
        await h.app.request(`/api/invites/${revoked.id}/revoke`, {
          method: "POST",
          headers: authHeaders(admin),
        })
      ).status,
    ).toBe(200);
    expect((await registerWith(revoked.code)).status).toBe(422);

    const expired = seedInvite(h, { expiresAt: Date.now() - DAY });
    expect((await registerWith(expired.code)).status).toBe(422);

    const missing = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "x@bolder.local", password: "password123", name: "X" }),
    });
    expect(missing.status).toBe(422);
  });

  it("normalizes codes before lookup (lowercase + dashes)", async () => {
    const invite = seedInvite(h);
    const messy = `${invite.code.slice(0, 4).toLowerCase()}-${invite.code.slice(4).toLowerCase()}`;
    const res = await registerWith(messy, { email: "messy@bolder.local" });
    expect(res.status).toBe(201);
  });

  it("revokes an active invite and blocks further redemption", async () => {
    const token = await asAdmin();
    const created = (await (await createInviteRequest(token, { role: "dev" })).json()) as {
      invite: { id: number; code: string };
    };

    const res = await h.app.request(`/api/invites/${created.invite.id}/revoke`, {
      method: "POST",
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { invite: { status: string } };
    expect(body.invite.status).toBe("revoked");

    expect((await registerWith(created.invite.code)).status).toBe(422);

    const list = (await (
      await h.app.request("/api/invites", { headers: authHeaders(token) })
    ).json()) as { invites: Array<{ id: number; status: string }> };
    expect(list.invites.find((invite) => invite.id === created.invite.id)?.status).toBe("revoked");
  });

  it("is idempotent when revoking twice, and 404s for unknown ids", async () => {
    const token = await asAdmin();
    const created = (await (await createInviteRequest(token, { role: "dev" })).json()) as {
      invite: { id: number };
    };

    for (const expected of [200, 200]) {
      const res = await h.app.request(`/api/invites/${created.invite.id}/revoke`, {
        method: "POST",
        headers: authHeaders(token),
      });
      expect(res.status).toBe(expected);
    }

    expect(
      (
        await h.app.request("/api/invites/999999/revoke", {
          method: "POST",
          headers: authHeaders(token),
        })
      ).status,
    ).toBe(404);
  });

  it("refuses to revoke a used invite (409)", async () => {
    const token = await asAdmin();
    const invite = seedInvite(h);
    expect((await registerWith(invite.code, { email: "used@bolder.local" })).status).toBe(201);

    const res = await h.app.request(`/api/invites/${invite.id}/revoke`, {
      method: "POST",
      headers: authHeaders(token),
    });
    expect(res.status).toBe(409);
  });

  it("guards revocation with auth and admin role", async () => {
    const dev = await registerUser(h, {
      email: "dev@bolder.local",
      password: "password123",
      name: "Dev",
      role: "dev",
    });
    const invite = seedInvite(h);

    expect(
      (
        await h.app.request(`/api/invites/${invite.id}/revoke`, {
          method: "POST",
          headers: JSON_HEADERS,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await h.app.request(`/api/invites/${invite.id}/revoke`, {
          method: "POST",
          headers: authHeaders(dev.token),
        })
      ).status,
    ).toBe(403);
  });

  it("lists invites newest first for admins only", async () => {
    const dev = await registerUser(h, {
      email: "dev@bolder.local",
      password: "password123",
      name: "Dev",
      role: "dev",
    });

    const older = seedInvite(h, { createdAt: Date.now() - 10_000 });
    const newer = seedInvite(h, { createdAt: Date.now() });

    expect((await h.app.request("/api/invites")).status).toBe(401);
    expect(
      (await h.app.request("/api/invites", { headers: authHeaders(dev.token) })).status,
    ).toBe(403);

    const admin = await asAdmin();
    const res = await h.app.request("/api/invites", { headers: authHeaders(admin) });
    expect(res.status).toBe(200);
    const { invites } = (await res.json()) as {
      invites: Array<{ id: number }>;
    };
    const ids = invites.map((invite) => invite.id);
    expect(ids).toContain(older.id);
    expect(ids).toContain(newer.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  });
});

describe("invites public validation", () => {
  it("validates without a token", async () => {
    const invite = seedInvite(h, { role: "tech_lead" });
    const res = await h.app.request("/api/invites/validate", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ code: invite.code.toLowerCase() }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, role: "tech_lead" });
  });

  it("reports not_found, used, revoked and expired without leaking metadata", async () => {
    async function validate(code: string) {
      const res = await h.app.request("/api/invites/validate", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ code }),
      });
      expect(res.status).toBe(200);
      return res.json();
    }

    expect(await validate("ZZZZZZZZ")).toEqual({ valid: false, reason: "not_found" });

    const used = seedInvite(h);
    expect((await registerWith(used.code, { email: "used@bolder.local" })).status).toBe(201);
    expect(await validate(used.code)).toEqual({ valid: false, reason: "used" });

    const revoked = seedInvite(h);
    const admin = await asAdmin();
    await h.app.request(`/api/invites/${revoked.id}/revoke`, {
      method: "POST",
      headers: authHeaders(admin),
    });
    expect(await validate(revoked.code)).toEqual({ valid: false, reason: "revoked" });

    const expired = seedInvite(h, { expiresAt: Date.now() - DAY });
    expect(await validate(expired.code)).toEqual({ valid: false, reason: "expired" });
  });
});

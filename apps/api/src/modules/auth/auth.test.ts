import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  registerUser,
  seedInvite,
  setupTestApp,
  type TestHarness,
} from "../../../test/helpers.js";

let h: TestHarness;

beforeEach(async () => {
  h = await setupTestApp();
});

afterEach(() => {
  h.cleanup();
});

const JSON_HEADERS = { "content-type": "application/json" };

describe("auth module", () => {
  it("checks the invite before the email, so it is not an account-existence oracle", async () => {
    // Register a user first so the email definitely exists.
    await registerUser(h, {
      email: "taken@bolder.local",
      password: "password123",
      name: "Taken",
    });

    // A caller with no credentials and a bogus code must not be able to learn
    // whether an email is registered: the invite error wins.
    const res = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: "taken@bolder.local",
        password: "password123",
        name: "Impostor",
        inviteCode: "NOSUCHCD",
      }),
    });

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Invitation code is not valid.");
  });

  it("uses a valid invite code to report a duplicate email", async () => {
    await registerUser(h, {
      email: "taken@bolder.local",
      password: "password123",
      name: "Taken",
    });
    const invite = seedInvite(h);

    const res = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: "taken@bolder.local",
        password: "password123",
        name: "Second",
        inviteCode: invite.code,
      }),
    });

    expect(res.status).toBe(409);
  });

  it("allows the browser to preflight the register endpoint", async () => {
    const res = await h.app.request("/api/auth/register", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
    expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain(
      "content-type",
    );
  });

  it("registers, verifies and returns the current user", async () => {
    const invite = seedInvite(h, { role: "tech_lead" });
    const registerRes = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: "dev@bolder.local",
        password: "password123",
        name: "Dev",
        inviteCode: invite.code,
      }),
    });
    expect(registerRes.status).toBe(201);
    const registered = (await registerRes.json()) as {
      user: { id: number; role: string; email: string };
      token: string;
    };
    // The role is derived from the invite, not from the default schema.
    expect(registered.user.role).toBe("tech_lead");
    expect(typeof registered.token).toBe("string");

    const verifyRes = await h.app.request("/api/auth/verify", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: "dev@bolder.local",
        password: "password123",
      }),
    });
    expect(verifyRes.status).toBe(200);

    const meRes = await h.app.request("/api/auth/me", {
      headers: { Authorization: `Bearer ${registered.token}` },
    });
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { user: { email: string } };
    expect(me.user.email).toBe("dev@bolder.local");
  });

  it("ignores a client-supplied role and uses the invite role", async () => {
    const invite = seedInvite(h, { role: "dev" });
    const res = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: "escalate@bolder.local",
        password: "password123",
        name: "Escalate",
        inviteCode: invite.code,
        role: "admin",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { user: { role: string } };
    expect(body.user.role).toBe("dev");
  });

  it("rejects registration without an invite code with 422", async () => {
    const res = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: "no-invite@bolder.local",
        password: "password123",
        name: "No Invite",
      }),
    });
    expect(res.status).toBe(422);
  });

  it("rejects duplicate registration with 409", async () => {
    const input = {
      email: "dup@bolder.local",
      password: "password123",
      name: "Dup",
      role: "dev" as const,
    };
    await registerUser(h, input);
    const res = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        name: input.name,
        inviteCode: seedInvite(h).code,
      }),
    });
    expect(res.status).toBe(409);
  });

  it("rejects a wrong password with 401", async () => {
    await registerUser(h, {
      email: "who@bolder.local",
      password: "password123",
      name: "Who",
      role: "dev",
    });
    const res = await h.app.request("/api/auth/verify", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: "who@bolder.local",
        password: "wrongpassword",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects /me without a token with 401", async () => {
    const res = await h.app.request("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("validates the payload with 422", async () => {
    const res = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "bad", password: "short", name: "" }),
    });
    expect(res.status).toBe(422);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  registerUser,
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
  it("registers, verifies and returns the current user", async () => {
    const registerRes = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: "dev@bolder.local",
        password: "password123",
        name: "Dev",
      }),
    });
    expect(registerRes.status).toBe(201);
    const registered = (await registerRes.json()) as {
      user: { id: number; role: string; email: string };
      token: string;
    };
    expect(registered.user.role).toBe("dev");
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

  it("rejects duplicate registration with 409", async () => {
    const input = {
      email: "dup@bolder.local",
      password: "password123",
      name: "Dup",
      role: "dev",
    };
    await registerUser(h.app, input);
    const res = await h.app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    });
    expect(res.status).toBe(409);
  });

  it("rejects a wrong password with 401", async () => {
    await registerUser(h.app, {
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

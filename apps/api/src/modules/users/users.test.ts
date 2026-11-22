import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authHeaders,
  registerUser,
  setupTestApp,
  type TestHarness,
} from "../../../test/helpers.js";

let h: TestHarness;
let token: string;
let userId: number;

interface Profile {
  id: number;
  email: string;
  name: string;
  role: string;
  image: string | null;
}

beforeEach(async () => {
  h = await setupTestApp();
  const registered = await registerUser(h.app, {
    email: "ada@bolder.local",
    password: "password123",
    name: "Ada Lovelace",
    role: "dev",
  });
  token = registered.token;
  userId = registered.user.id;
});

afterEach(() => {
  h.cleanup();
});

async function getMe(): Promise<{ status: number; user: Profile | null }> {
  const res = await h.app.request("/api/users/me", { headers: authHeaders(token) });
  if (res.status !== 200) return { status: res.status, user: null };
  const body = (await res.json()) as { user: Profile };
  return { status: res.status, user: body.user };
}

async function patchMe(payload: unknown): Promise<{ status: number; user: Profile | null }> {
  const res = await h.app.request("/api/users/me", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { status: res.status, user: null };
  const body = (await res.json()) as { user: Profile };
  return { status: res.status, user: body.user };
}

describe("users module (profile)", () => {
  it("requires a bearer token on both endpoints", async () => {
    const getRes = await h.app.request("/api/users/me");
    expect(getRes.status).toBe(401);

    const patchRes = await h.app.request("/api/users/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Hacker" }),
    });
    expect(patchRes.status).toBe(401);
  });

  it("returns the caller's own profile", async () => {
    const { status, user } = await getMe();
    expect(status).toBe(200);
    expect(user).toMatchObject({
      id: userId,
      email: "ada@bolder.local",
      name: "Ada Lovelace",
      role: "dev",
      image: null,
    });
  });

  it("updates the display name and persists it", async () => {
    const { status, user } = await patchMe({ name: "Ada L." });
    expect(status).toBe(200);
    expect(user?.name).toBe("Ada L.");

    const again = await getMe();
    expect(again.user?.name).toBe("Ada L.");
  });

  it("stores an http(s) image URL and returns it", async () => {
    const url = "https://i.pinimg.com/564x/ada.png";
    const { status, user } = await patchMe({ image: url });
    expect(status).toBe(200);
    expect(user?.image).toBe(url);

    const again = await getMe();
    expect(again.user?.image).toBe(url);
  });

  it("clears the image when sent an empty string", async () => {
    await patchMe({ image: "https://example.com/a.png" });
    const { user } = await patchMe({ image: "" });
    expect(user?.image).toBeNull();
  });

  it("updates name and image together", async () => {
    const { status, user } = await patchMe({
      name: "Grace Hopper",
      image: "https://example.com/grace.png",
    });
    expect(status).toBe(200);
    expect(user?.name).toBe("Grace Hopper");
    expect(user?.image).toBe("https://example.com/grace.png");
  });

  it("leaves untouched fields alone on a partial update", async () => {
    await patchMe({ image: "https://example.com/keep.png" });
    const { user } = await patchMe({ name: "Only Name" });
    expect(user?.name).toBe("Only Name");
    expect(user?.image).toBe("https://example.com/keep.png");
  });

  it("rejects non-http image URLs and bad names with 422", async () => {
    const jsUrl = await patchMe({ image: "javascript:alert(1)" });
    expect(jsUrl.status).toBe(422);

    const emptyName = await patchMe({ name: "   " });
    expect(emptyName.status).toBe(422);

    const tooLong = await patchMe({ name: "x".repeat(81) });
    expect(tooLong.status).toBe(422);

    // Nothing was persisted by the failed attempts.
    const { user } = await getMe();
    expect(user?.name).toBe("Ada Lovelace");
    expect(user?.image).toBeNull();
  });
});

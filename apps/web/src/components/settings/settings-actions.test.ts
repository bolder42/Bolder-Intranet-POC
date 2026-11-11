import { beforeEach, describe, expect, it, vi } from "vitest";

const { $get, $patch } = vi.hoisted(() => ({
  $get: vi.fn(),
  $patch: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer test-token" })),
  api: {
    api: {
      users: {
        me: {
          $get: (...args: unknown[]) => $get(...args),
          $patch: (...args: unknown[]) => $patch(...args),
        },
      },
    },
  },
}));

import { getProfileAction, updateProfileAction } from "./settings-actions";

const profile = {
  id: 1,
  email: "ada@bolder.local",
  name: "Ada",
  role: "dev" as const,
  image: null,
};

beforeEach(() => {
  $get.mockReset();
  $patch.mockReset();
});

describe("settings actions", () => {
  it("calls GET /users/me with the two-argument shape so headers are not dropped", async () => {
    // Regression: `$get({ headers })` treats the object as route args and
    // silently sends NO Authorization header → 401 → photo-less fallback.
    $get.mockResolvedValue({ ok: true, json: async () => ({ user: profile }) });

    const user = await getProfileAction();

    expect($get).toHaveBeenCalledWith({}, { headers: { authorization: "Bearer test-token" } });
    expect(user).toEqual(profile);
  });

  it("returns null when the API rejects so the caller can fall back to the session", async () => {
    $get.mockResolvedValue({ ok: false, status: 401 });

    expect(await getProfileAction()).toBeNull();
  });

  it("returns null instead of throwing when the fetch itself fails", async () => {
    $get.mockRejectedValue(new Error("network down"));

    expect(await getProfileAction()).toBeNull();
  });

  it("returns the updated profile from PATCH", async () => {
    $patch.mockResolvedValue({ ok: true, json: async () => ({ user: { ...profile, name: "Ada L." } }) });

    const updated = await updateProfileAction({ name: "Ada L." });

    expect(updated.name).toBe("Ada L.");
    expect($patch).toHaveBeenCalledWith(
      { json: { name: "Ada L." } },
      { headers: { authorization: "Bearer test-token" } },
    );
  });

  it("surfaces the API error message when the save fails", async () => {
    $patch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "Invalid request payload" } }),
    });

    await expect(updateProfileAction({ name: "x" })).rejects.toThrow("Invalid request payload");
  });
});

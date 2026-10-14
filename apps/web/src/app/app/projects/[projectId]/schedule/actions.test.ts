import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/api", () => ({
  getAuthHeaders: async () => ({ authorization: "Bearer test" }),
  api: {
    api: {
      schedule: {
        ":projectId": {
          $post: mocks.post,
          ":itemId": { $patch: mocks.patch, $delete: mocks.remove },
        },
      },
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { deleteScheduleItemAction, saveScheduleItem } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("projectId", "1");
  data.set("title", "Launch");
  data.set("kind", "deadline");
  data.set("dueAt", "2026-11-06");
  data.set("description", "Ship it");
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

it("denies a dev before contacting the API", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "dev" } });
  const result = await saveScheduleItem({ ok: false }, form());
  expect(result.ok).toBe(false);
  expect(result.error).toContain("cannot");
  expect(mocks.post).not.toHaveBeenCalled();
  expect(mocks.patch).not.toHaveBeenCalled();
});

it("creates an item with a UTC timestamp and revalidates the schedule", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "tech_lead" } });
  mocks.post.mockResolvedValue({ ok: true });

  const result = await saveScheduleItem({ ok: false }, form());

  expect(mocks.post).toHaveBeenCalledWith(
    {
      param: { projectId: "1" },
      json: {
        title: "Launch",
        kind: "deadline",
        dueAt: Date.UTC(2026, 10, 6),
        description: "Ship it",
      },
    },
    { headers: { authorization: "Bearer test" } },
  );
  expect(mocks.revalidate).toHaveBeenCalledWith("/app/projects/1/schedule");
  expect(result.ok).toBe(true);
});

it("rejects an invalid payload without calling the API", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "admin" } });
  const result = await saveScheduleItem({ ok: false }, form({ dueAt: "" }));
  expect(result.ok).toBe(false);
  expect(result.error).toContain("Check the title");
  expect(mocks.post).not.toHaveBeenCalled();
});

it("updates an existing item when an itemId is present", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "admin" } });
  mocks.patch.mockResolvedValue({ ok: true });

  const result = await saveScheduleItem({ ok: false }, form({ itemId: "7", description: "" }));

  expect(mocks.patch).toHaveBeenCalledWith(
    {
      param: { projectId: "1", itemId: "7" },
      json: {
        title: "Launch",
        kind: "deadline",
        dueAt: Date.UTC(2026, 10, 6),
        description: null,
      },
    },
    { headers: { authorization: "Bearer test" } },
  );
  expect(result.ok).toBe(true);
});

it("surfaces API failures without revalidating", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "tech_lead" } });
  mocks.post.mockResolvedValue({ ok: false });

  const result = await saveScheduleItem({ ok: false }, form());
  expect(result.ok).toBe(false);
  expect(result.error).toContain("Unable to save");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

it("denies a dev from deleting before contacting the API", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "dev" } });
  expect(await deleteScheduleItemAction("", form({ itemId: "7" }))).toContain("cannot");
  expect(mocks.remove).not.toHaveBeenCalled();
});

it("deletes an item for a writer and revalidates", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "admin" } });
  mocks.remove.mockResolvedValue({ ok: true });

  const result = await deleteScheduleItemAction("", form({ itemId: "7" }));

  expect(mocks.remove).toHaveBeenCalledWith(
    { param: { projectId: "1", itemId: "7" } },
    { headers: { authorization: "Bearer test" } },
  );
  expect(mocks.revalidate).toHaveBeenCalledWith("/app/projects/1/schedule");
  expect(result).toBe("");
});

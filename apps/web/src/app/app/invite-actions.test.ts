import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/api", () => ({
  getAuthHeaders: async () => ({ authorization: "Bearer test" }),
  api: {
    api: {
      invites: {
        $get: mocks.list,
        $post: mocks.create,
        ":id": { revoke: { $post: mocks.revoke } },
      },
    },
  },
}));
import { manageInvites } from "./invite-actions";

const invite = {
  id: 1,
  code: "ABCD2345",
  role: "dev",
  status: "active",
  createdBy: 1,
  createdAt: 1,
  expiresAt: 9999999999999,
  revokedAt: null,
  usedAt: null,
  usedBy: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { role: "admin" } });
});

it.each(["dev", "tech_lead", null])(
  "denies invitation management for %s before any API call",
  async (role) => {
    mocks.auth.mockResolvedValue(role ? { user: { role } } : null);
    for (const operation of ["list", "create", "revoke"] as const)
      expect(await manageInvites(operation, { id: 1 })).toHaveProperty("error");
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.revoke).not.toHaveBeenCalled();
  },
);
it("loads invitations without caching", async () => {
  mocks.list.mockResolvedValue({ ok: true, json: async () => ({ invites: [invite] }) });
  expect(await manageInvites("list")).toEqual({ invites: [invite] });
  expect(mocks.list).toHaveBeenCalledWith(
    {},
    { headers: { authorization: "Bearer test" }, init: { cache: "no-store" } },
  );
});
it("generates an invitation with a selected role and expiry", async () => {
  mocks.create.mockResolvedValue({ ok: true, json: async () => ({ invite }) });
  expect(await manageInvites("create", { role: "dev", expiresInDays: 7 })).toEqual({ invite });
  expect(mocks.create).toHaveBeenCalledWith(
    { json: { role: "dev", expiresInDays: 7 } },
    { headers: { authorization: "Bearer test" } },
  );
});
it("rejects invalid expiry and invite IDs", async () => {
  expect(await manageInvites("create", { expiresInDays: 0 })).toHaveProperty("error");
  expect(await manageInvites("revoke", { id: -1 })).toHaveProperty("error");
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.revoke).not.toHaveBeenCalled();
});
it("revokes invitations through the Invitations API", async () => {
  mocks.revoke.mockResolvedValue({
    ok: true,
    json: async () => ({ invite: { ...invite, status: "revoked", revokedAt: 2 } }),
  });
  expect(await manageInvites("revoke", { id: 1 })).toHaveProperty("invite.status", "revoked");
});
it("reports API failures without claiming success", async () => {
  mocks.create.mockResolvedValue({ ok: false });
  expect(await manageInvites("create")).toHaveProperty("error");
  mocks.list.mockRejectedValue(new Error("offline"));
  expect(await manageInvites("list")).toHaveProperty("error");
});

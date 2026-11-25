import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const manage = vi.hoisted(() => vi.fn());
vi.mock("@/app/app/invite-actions", () => ({ manageInvites: manage }));
import { InvitationsWidget } from "./invitations-widget";

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
});

it("generates, copies and revokes an invitation; inactive codes have no revoke control", async () => {
  manage
    .mockResolvedValueOnce({ invites: [] })
    .mockResolvedValueOnce({ invite })
    .mockResolvedValueOnce({ invite: { ...invite, status: "revoked", revokedAt: Date.now() } });
  const copy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copy } });
  render(<InvitationsWidget />);
  await screen.findByText("No invitations yet.");
  fireEvent.change(screen.getByLabelText("Account role"), { target: { value: "tech_lead" } });
  fireEvent.change(screen.getByLabelText("Expires in (days)"), { target: { value: "14" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate invitation" }));
  await screen.findByText("ABCD2345");
  expect(manage).toHaveBeenCalledWith("create", { role: "tech_lead", expiresInDays: 14 });
  fireEvent.click(screen.getByRole("button", { name: "Copy ABCD2345" }));
  await waitFor(() => expect(copy).toHaveBeenCalledWith("ABCD2345"));
  fireEvent.click(screen.getByRole("button", { name: "Revoke ABCD2345" }));
  await screen.findByText("revoked");
  expect(screen.queryByRole("button", { name: "Revoke ABCD2345" })).not.toBeInTheDocument();
});

it("shows a recoverable load error and refreshes the list", async () => {
  manage
    .mockResolvedValueOnce({ error: "Unable to load invitations." })
    .mockResolvedValueOnce({ invites: [invite] });
  render(<InvitationsWidget />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load");
  fireEvent.click(screen.getByRole("button", { name: "Refresh invitations" }));
  await screen.findByText(invite.code);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("never offers copy or revoke for used, expired or revoked codes", async () => {
  manage.mockResolvedValue({
    invites: [
      { ...invite, usedAt: Date.now() },
      { ...invite, id: 2, code: "EXPIRED", expiresAt: 1 },
      { ...invite, id: 3, code: "REVOKED", revokedAt: Date.now() },
    ],
  });
  render(<InvitationsWidget />);
  await screen.findByText("expired");
  expect(screen.queryByRole("button", { name: /^Revoke / })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Copy / })).not.toBeInTheDocument();
});

it("reports failed revocation and retains the active code", async () => {
  manage
    .mockResolvedValueOnce({ invites: [invite] })
    .mockResolvedValueOnce({ error: "Unable to revoke." });
  render(<InvitationsWidget />);
  fireEvent.click(await screen.findByRole("button", { name: "Revoke ABCD2345" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to revoke.");
  expect(screen.getByRole("button", { name: "Revoke ABCD2345" })).toBeInTheDocument();
});

it("recovers when the initial server action cannot be reached", async () => {
  manage.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ invites: [] });
  render(<InvitationsWidget />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load");
  fireEvent.click(screen.getByRole("button", { name: "Refresh invitations" }));
  await screen.findByText("No invitations yet.");
});

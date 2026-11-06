import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
}));

Object.defineProperty(globalThis, "fetch", { value: mocks.fetch, writable: true });

import { RegisterForm } from "./register-form";

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("renders a labelled invite code field", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText("Invite code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("shows the granted role on a valid code", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, role: "tech_lead" }),
    });

    vi.useFakeTimers();
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText("Invite code"), { target: { value: "VALID-CODE" } });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText("Code accepted · Tech Lead")).toBeInTheDocument();

    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/invites/validate"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "VALID-CODE" }),
      }),
    );
  });

  it.each([
    ["not_found", "This invite code does not exist."],
    ["used", "This invite code has already been used."],
    ["revoked", "This invite code has been revoked."],
    ["expired", "This invite code has expired."],
  ] as const)("shows a specific message when the code is %s", async (reason, message) => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ valid: false, reason }),
    });

    vi.useFakeTimers();
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText("Invite code"), { target: { value: "BAD-CODE" } });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("does not call validate before the debounce elapses", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, role: "dev" }),
    });

    vi.useFakeTimers();
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText("Invite code"), { target: { value: "CODE" } });

    expect(mocks.fetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(399);
    });
    expect(mocks.fetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("submits inviteCode in the request body", async () => {
    mocks.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, role: "dev" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    mocks.signIn.mockResolvedValue({ ok: true });

    vi.useFakeTimers();
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText("Invite code"), { target: { value: "INVITE-123" } });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText("Code accepted · Dev")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada Lovelace" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(mocks.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/auth/register"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          password: "secure-password",
          inviteCode: "INVITE-123",
        }),
      }),
    );

    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "ada@example.com",
      password: "secure-password",
      redirectTo: "/app",
    });
  });
});

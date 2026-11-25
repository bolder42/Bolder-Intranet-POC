import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), performance: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/api", () => ({
  getAuthHeaders: async () => ({}),
  api: {
    api: {
      home: {
        summary: { $get: async () => ({ ok: false }) },
        performance: { $get: mocks.performance },
      },
      projects: { $get: async () => ({ ok: true, json: async () => ({ projects: [] }) }) },
    },
  },
}));
vi.mock("@/components/home", () => ({
  DashboardHeader: () => <div>Greeting</div>,
  QuickLinksCallout: () => <div>Quick links</div>,
  TasksWidget: () => <div>Tasks</div>,
  ProjectsWidget: () => <div>Projects</div>,
  NotesGrid: () => <div>Notes</div>,
}));
vi.mock("@/components/home/invitations-widget", () => ({
  InvitationsWidget: () => <div>Invitations</div>,
}));
import HomePage from "./page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.performance.mockResolvedValue({ ok: true, json: async () => ({ projects: [] }) });
});
it("preserves the Dev dashboard without requesting leadership metrics", async () => {
  mocks.auth.mockResolvedValue({ user: { name: "Dev", role: "dev" } });
  render(await HomePage());
  expect(screen.getByText("Tasks")).toBeInTheDocument();
  expect(screen.getByText("Projects")).toBeInTheDocument();
  expect(screen.queryByText("Project performance")).not.toBeInTheDocument();
  expect(screen.queryByText("Invitations")).not.toBeInTheDocument();
  expect(mocks.performance).not.toHaveBeenCalled();
});
it.each(["tech_lead", "admin"])(
  "inserts metrics between Quick links and Tasks for %s",
  async (role) => {
    mocks.auth.mockResolvedValue({ user: { name: "Lead", role } });
    const { container } = render(await HomePage());
    const text = container.textContent!;
    expect(text.indexOf("Project performance")).toBeGreaterThan(text.indexOf("Quick links"));
    expect(text.indexOf("Project performance")).toBeLessThan(text.indexOf("Tasks"));
    expect(Boolean(screen.queryByText("Invitations"))).toBe(role === "admin");
    expect(
      screen.getByText(role === "admin" ? /All projects/ : /Projects you participate in/),
    ).toBeInTheDocument();
  },
);
it("shows an explicit error instead of fabricated leadership statistics", async () => {
  mocks.auth.mockResolvedValue({ user: { role: "tech_lead" } });
  mocks.performance.mockResolvedValue({ ok: false });
  render(await HomePage());
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to load project performance");
});

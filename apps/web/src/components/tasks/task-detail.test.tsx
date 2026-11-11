import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TaskListItem } from "./task-types";
import { TaskDetail } from "./task-detail";

const DAY_MS = 24 * 60 * 60 * 1000;

function task(overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id: 42,
    projectId: 7,
    title: "Build the board",
    description: null,
    status: "doing",
    priority: "high",
    assigneeId: 1,
    dueAt: null,
    createdAt: Date.UTC(2026, 9, 1),
    assignee: { id: 1, name: "Ada Lovelace", email: "ada@bolder.local", role: "dev" },
    ...overrides,
  };
}

function renderDetail(
  overrides: Partial<TaskListItem> = {},
  onEdit = vi.fn(),
  onClose = vi.fn(),
  number = 3,
) {
  const utils = render(
    <TaskDetail task={task(overrides)} number={number} onEdit={onEdit} onClose={onClose} />,
  );
  return { ...utils, onEdit, onClose };
}

describe("TaskDetail", () => {
  it("shows the task number, the title and the status", () => {
    renderDetail();

    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Build the board" })).toBeInTheDocument();
    expect(screen.getByText("Doing")).toBeInTheDocument();
  });

  it("hides the number when the task has no ordinal yet", () => {
    renderDetail({}, vi.fn(), vi.fn(), 0);
    expect(screen.queryByText("#0")).not.toBeInTheDocument();
  });

  it("lists the priority, the assignee, the due date and the creation date", () => {
    renderDetail({ dueAt: Date.UTC(2026, 9, 20) });

    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("20/10/2026")).toBeInTheDocument();
    expect(screen.getByText("01/10/2026")).toBeInTheDocument();
  });

  it("says who owns the task when nobody is assigned", () => {
    renderDetail({ assigneeId: null, assignee: null });
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("marks an overdue due date with the danger token class", () => {
    renderDetail({ dueAt: Date.now() - 3 * DAY_MS });
    const fact = screen.getByText("Due date").parentElement;
    expect(fact?.querySelector("dd")).toHaveClass("task-due-overdue");
  });

  it("lays the description out as a page with a facts panel beside it", () => {
    renderDetail({ description: "## Plan\n\n- wire the board" });

    // The description is its own framed section…
    const description = screen.getByRole("region", { name: "Description" });
    expect(within(description).getByRole("heading", { name: "Plan" })).toBeInTheDocument();

    // …and the facts sit in a separate panel.
    const side = screen.getByRole("complementary");
    expect(within(side).getByText("Status")).toBeInTheDocument();
    expect(within(side).getByText("Assignee")).toBeInTheDocument();
  });

  it("renders the description as Markdown", () => {
    renderDetail({ description: "## Plan\n\n- wire the board\n- **ship** it" });

    expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByText("wire the board").tagName).toBe("LI");
    expect(screen.getByText("ship").tagName).toBe("STRONG");
  });

  it("shows an empty-state line when the task has no description", () => {
    renderDetail({ description: null });
    expect(screen.getByText(/No description yet/)).toBeInTheDocument();
  });

  it("never renders raw HTML coming from the description", () => {
    renderDetail({ description: "<img src=x onerror=alert(1)>" });
    expect(document.querySelector("img")).toBeNull();
  });

  it("hands the task over to the edit form", () => {
    const { onEdit } = renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Edit task" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit.mock.calls[0]?.[0]).toMatchObject({ id: 42, title: "Build the board" });
  });

  it("closes from the footer button and from the corner button", () => {
    const { onClose } = renderDetail();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close task details" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("has no editable fields", () => {
    renderDetail();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});

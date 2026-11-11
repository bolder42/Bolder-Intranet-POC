import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TaskCard } from "./task-card";
import type { TaskListItem } from "./task-types";

function task(overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id: 42,
    projectId: 7,
    title: "Build the board",
    description: "## Plan",
    status: "doing",
    priority: "high",
    assigneeId: null,
    dueAt: null,
    createdAt: Date.now(),
    assignee: null,
    ...overrides,
  };
}

function renderCard(overrides: Partial<TaskListItem> = {}, number = 2) {
  return render(
    <TaskCard
      task={task(overrides)}
      number={number}
      dragging={false}
      onDragStart={vi.fn()}
      onMove={vi.fn()}
      onOpen={vi.fn()}
    />,
  );
}

describe("TaskCard", () => {
  it("shows the per-project number, not the global task id", () => {
    renderCard({ id: 42 });

    const card = screen.getByRole("article", { name: "Build the board" });
    expect(within(card).getByText("#2")).toBeInTheDocument();
    expect(within(card).queryByText("#42")).not.toBeInTheDocument();
  });

  it("leaves the number out when the task has no ordinal yet", () => {
    renderCard({ id: 42 }, 0);

    const card = screen.getByRole("article", { name: "Build the board" });
    expect(within(card).queryByText("#0")).not.toBeInTheDocument();
    // The priority flag stays on the right of the card.
    expect(within(card).getByText("High")).toHaveClass("task-priority-high");
  });

  it("never shows the description", () => {
    renderCard();
    const card = screen.getByRole("article", { name: "Build the board" });
    expect(within(card).queryByText("Plan")).not.toBeInTheDocument();
  });
});

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
    // The priority flag sits below the title when there is no number row.
    expect(within(card).getByText("High")).toHaveClass("task-priority-high");
  });

  it("never shows the description", () => {
    renderCard();
    const card = screen.getByRole("article", { name: "Build the board" });
    expect(within(card).queryByText("Plan")).not.toBeInTheDocument();
  });

  it("shows the assignee photo in the top-right, with the priority flag below the title", () => {
    renderCard({
      assigneeId: 1,
      assignee: {
        id: 1,
        name: "Ada Lovelace",
        email: "ada@bolder.local",
        role: "dev",
        image: "https://x.co/ada.png",
      },
    });

    const card = screen.getByRole("article", { name: "Build the board" });
    const avatar = card.querySelector(".task-card-assignees");
    expect(avatar).not.toBeNull();
    expect(avatar).toHaveAttribute("aria-label", "Assigned to Ada Lovelace");
    expect(card.querySelector("img.user-avatar")).toHaveAttribute(
      "src",
      "https://x.co/ada.png",
    );

    // DOM order: top row (number + photo) → title → priority flag.
    const title = within(card).getByText("Build the board");
    const flag = within(card).getByText("High");
    expect(avatar!.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(flag) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("omits the avatar when nobody is assigned", () => {
    const { container } = renderCard();

    expect(container.querySelector(".task-card-assignees")).toBeNull();
  });
});

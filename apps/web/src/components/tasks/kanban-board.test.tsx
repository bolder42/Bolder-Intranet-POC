import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./tasks-api", () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  moveTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
}));

import type { BoardMember, TaskListItem } from "./task-types";
import { KanbanBoard } from "./kanban-board";
import { createTask, moveTaskStatus } from "./tasks-api";

const DAY_MS = 24 * 60 * 60 * 1000;

function task(overrides: Partial<TaskListItem> & { id: number; title: string }): TaskListItem {
  return {
    projectId: 7,
    description: null,
    status: "todo",
    priority: "medium",
    assigneeId: null,
    dueAt: null,
    createdAt: Date.now(),
    assignee: null,
    ...overrides,
  };
}

const members: BoardMember[] = [
  { user: { id: 1, name: "Ada Lovelace", email: "ada@bolder.local", role: "dev" } },
  { user: { id: 2, name: "Grace Hopper", email: "grace@bolder.local", role: "dev" } },
];

// Ids deliberately differ from the per-project numbers the board shows:
// the `#` of a task is its creation ordinal inside the project, not the
// global `tasks.id`.
const initialTasks: TaskListItem[] = [
  task({ id: 10, title: "Write the brief", status: "todo", priority: "medium" }),
  task({
    id: 11,
    title: "Build the board",
    status: "doing",
    priority: "high",
    description: "## Plan\n\n- wire the board\n- **ship** it",
    assigneeId: 1,
    assignee: { id: 1, name: "Ada Lovelace", email: "ada@bolder.local", role: "dev" },
  }),
  task({ id: 12, title: "Ship the demo", status: "done", priority: "low" }),
];

function renderBoard(tasks: TaskListItem[] = initialTasks) {
  return render(<KanbanBoard projectId="7" initialTasks={tasks} members={members} />);
}

function column(label: string): HTMLElement {
  return screen.getByRole("region", { name: label });
}

/** Clicks a card title, which opens the read-only detail view. */
function openTask(title: string): void {
  fireEvent.click(screen.getByRole("button", { name: title }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("KanbanBoard", () => {
  it("renders four columns in board order with count pills and the cards from props", () => {
    renderBoard();

    const columnsEl = document.querySelector(".kanban-columns") as HTMLElement;
    const regions = within(columnsEl).getAllByRole("region");
    expect(regions.map((region) => region.getAttribute("aria-label"))).toEqual([
      "Backlog",
      "To Do",
      "Doing",
      "Done",
    ]);

    expect(within(column("To Do")).getByText("Write the brief")).toBeInTheDocument();
    expect(within(column("Doing")).getByText("Build the board")).toBeInTheDocument();
    expect(within(column("Done")).getByText("Ship the demo")).toBeInTheDocument();

    expect(screen.getByLabelText("1 tasks in To Do")).toHaveTextContent("1");
    expect(screen.getByLabelText("0 tasks in Backlog")).toHaveTextContent("0");
    expect(screen.getByText("1 of 3 done")).toBeInTheDocument();
    expect(screen.getByText(/0 backlog.*1 to do.*1 doing.*1 done/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
  });

  it("renders backlog cards in the first column", () => {
    renderBoard([
      task({ id: 9, title: "Someday idea", status: "backlog", priority: "low" }),
      ...initialTasks,
    ]);

    expect(within(column("Backlog")).getByText("Someday idea")).toBeInTheDocument();
    expect(screen.getByLabelText("1 tasks in Backlog")).toHaveTextContent("1");
    expect(screen.getByText(/1 backlog.*1 to do.*1 doing.*1 done/)).toBeInTheDocument();
  });

  it("keeps the card to the task number, the title and the priority flag", () => {
    renderBoard();

    const card = screen.getByRole("article", { name: "Build the board" });
    expect(within(card).getByText("#2")).toBeInTheDocument();
    expect(within(card).getByText("High")).toBeInTheDocument();
    // The description, the assignee and the dates live in the detail view.
    expect(within(card).queryByText("Plan")).not.toBeInTheDocument();
    expect(within(card).queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(within(card).queryByText(/Due/)).not.toBeInTheDocument();
  });

  it("numbers the cards by their creation order inside the project, not by id", () => {
    renderBoard();

    // The ids are 10, 11 and 12: the board shows #1, #2 and #3.
    expect(within(column("To Do")).getByText("#1")).toBeInTheDocument();
    expect(within(column("Doing")).getByText("#2")).toBeInTheDocument();
    expect(within(column("Done")).getByText("#3")).toBeInTheDocument();
    expect(screen.queryByText("#10")).not.toBeInTheDocument();
    expect(screen.queryByText("#11")).not.toBeInTheDocument();
    expect(screen.queryByText("#12")).not.toBeInTheDocument();
  });

  it("lists the cards of a column in the order of their numbers", () => {
    renderBoard([
      task({ id: 12, title: "Third", status: "todo" }),
      task({ id: 10, title: "First", status: "todo" }),
      task({ id: 11, title: "Second", status: "todo" }),
    ]);

    const cards = within(column("To Do")).getAllByRole("article");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "First",
      "Second",
      "Third",
    ]);
    expect(cards.map((card) => within(card).getByText(/^#\d+$/).textContent)).toEqual([
      "#1",
      "#2",
      "#3",
    ]);
  });

  it("numbers the cards by creation order even when the list is out of order", () => {
    renderBoard([initialTasks[2]!, initialTasks[0]!, initialTasks[1]!]);

    expect(within(column("To Do")).getByText("#1")).toBeInTheDocument();
    expect(within(column("Doing")).getByText("#2")).toBeInTheDocument();
    expect(within(column("Done")).getByText("#3")).toBeInTheDocument();
  });

  it("puts the task number and the priority flag above the title", () => {
    renderBoard();

    const card = screen.getByRole("article", { name: "Build the board" });
    const number = within(card).getByText("#2");
    const badge = within(card).getByText("High");
    const title = within(card).getByText("Build the board");
    expect(number.compareDocumentPosition(badge)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(badge.compareDocumentPosition(title)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("shows a priority badge with the right tone on every card", () => {
    renderBoard();

    const doingCard = screen.getByRole("article", { name: "Build the board" });
    expect(within(doingCard).getByText("High")).toHaveClass("task-priority-high");

    const todoCard = screen.getByRole("article", { name: "Write the brief" });
    expect(within(todoCard).getByText("Medium")).toHaveClass("task-priority-medium");

    const doneCard = screen.getByRole("article", { name: "Ship the demo" });
    expect(within(doneCard).getByText("Low")).toHaveClass("task-priority-low");
  });

  it("shows empty-column copy when a column has no tasks", () => {
    renderBoard([task({ id: 1, title: "Only todo", status: "todo" })]);
    expect(within(column("Backlog")).getByText("No tasks yet.")).toBeInTheDocument();
    expect(within(column("Doing")).getByText("No tasks yet.")).toBeInTheDocument();
    expect(within(column("Done")).getByText("No tasks yet.")).toBeInTheDocument();
  });

  it("moves a card through the accessible status control via the RPC", async () => {
    vi.mocked(moveTaskStatus).mockResolvedValue({ ...initialTasks[0]!, status: "done" });
    renderBoard();

    fireEvent.change(screen.getByLabelText("Move Write the brief to another stage"), {
      target: { value: "done" },
    });

    expect(moveTaskStatus).toHaveBeenCalledWith("7", 10, "done");
    await waitFor(() => {
      expect(within(column("Done")).getByText("Write the brief")).toBeInTheDocument();
    });
  });

  it("moves a card to backlog through the accessible status control", async () => {
    vi.mocked(moveTaskStatus).mockResolvedValue({ ...initialTasks[0]!, status: "backlog" });
    renderBoard();

    fireEvent.change(screen.getByLabelText("Move Write the brief to another stage"), {
      target: { value: "backlog" },
    });

    expect(moveTaskStatus).toHaveBeenCalledWith("7", 10, "backlog");
    await waitFor(() => {
      expect(within(column("Backlog")).getByText("Write the brief")).toBeInTheDocument();
    });
  });

  it("rolls the card back and shows an error when the move fails", async () => {
    vi.mocked(moveTaskStatus).mockRejectedValue(new Error("offline"));
    renderBoard();

    fireEvent.change(screen.getByLabelText("Move Write the brief to another stage"), {
      target: { value: "doing" },
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Could not move the task");
    });
    expect(within(column("To Do")).getByText("Write the brief")).toBeInTheDocument();
  });

  it("creates a task through the New task form and shows it on the board", async () => {
    const created = task({ id: 13, title: "Review copy", status: "todo", priority: "high" });
    vi.mocked(createTask).mockResolvedValue(created);
    renderBoard();

    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Review copy" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "high" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith(
        "7",
        expect.objectContaining({ title: "Review copy", status: "todo", priority: "high" }),
      );
    });
    await waitFor(() => {
      expect(screen.getAllByText("Review copy").length).toBeGreaterThan(0);
    });
    // The new task is the fourth one created in the project.
    const card = screen.getByRole("article", { name: "Review copy" });
    expect(within(card).getByText("#4")).toBeInTheDocument();
  });

  it("creates a task preset to backlog from the column add button", async () => {
    const created = task({ id: 14, title: "Parked idea", status: "backlog", priority: "medium" });
    vi.mocked(createTask).mockResolvedValue(created);
    renderBoard();

    fireEvent.click(screen.getByRole("button", { name: "Add a task to Backlog" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Parked idea" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith(
        "7",
        expect.objectContaining({ title: "Parked idea", status: "backlog" }),
      );
    });
  });

  it("marks an overdue task with the danger token class in the detail view", () => {
    const overdue = task({ id: 5, title: "Late report", status: "todo", dueAt: Date.now() - 3 * DAY_MS });
    renderBoard([overdue]);
    openTask("Late report");

    const fact = screen.getByText("Due date").parentElement;
    expect(fact?.querySelector("dd")).toHaveClass("task-due-overdue");
  });

  it("marks a task due within two days with the amber token class in the detail view", () => {
    const soon = task({ id: 6, title: "Almost due", status: "todo", dueAt: Date.now() + DAY_MS });
    renderBoard([soon]);
    openTask("Almost due");

    const fact = screen.getByText("Due date").parentElement;
    expect(fact?.querySelector("dd")).toHaveClass("task-due-soon");
  });

  it("opens a read-only detail view when a card is clicked", () => {
    renderBoard();
    openTask("Build the board");

    const dialog = screen.getByRole("dialog", { name: "Task details" });
    expect(within(dialog).getByRole("heading", { name: "Build the board" })).toBeInTheDocument();
    expect(within(dialog).getByText("#2")).toBeInTheDocument();
    expect(within(dialog).getByText("Doing")).toBeInTheDocument();
    expect(within(dialog).getByText("High")).toBeInTheDocument();
    expect(within(dialog).getByText("Ada Lovelace")).toBeInTheDocument();
    // No editable fields in the detail view.
    expect(within(dialog).queryByLabelText("Title")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox", { name: "Description" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("puts the description and the facts side by side in the detail view", () => {
    renderBoard();
    openTask("Build the board");

    const dialog = screen.getByRole("dialog", { name: "Task details" });
    const columns = dialog.querySelector(".task-detail-columns");
    expect(columns).not.toBeNull();
    expect(columns?.querySelector(".task-detail-card")).not.toBeNull();
    expect(columns?.querySelector(".task-detail-side")).not.toBeNull();
    // The description leads, the facts sit in the panel beside it.
    const cards = within(columns as HTMLElement).getAllByRole("region");
    expect(cards[0]).toHaveAccessibleName("Description");
    expect(within(columns as HTMLElement).getByRole("complementary")).toHaveAccessibleName("Details");
  });

  it("renders the description as Markdown in the detail view", () => {
    renderBoard();
    openTask("Build the board");

    const dialog = screen.getByRole("dialog", { name: "Task details" });
    expect(within(dialog).getByRole("heading", { name: "Plan" })).toBeInTheDocument();
    expect(within(dialog).getByText("wire the board")).toBeInTheDocument();
    expect(within(dialog).getByText("ship").tagName).toBe("STRONG");
  });

  it("opens the edit form from the detail view and comes back on cancel", () => {
    renderBoard();
    openTask("Build the board");

    fireEvent.click(screen.getByRole("button", { name: "Edit task" }));
    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Build the board");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog", { name: "Task details" })).toBeInTheDocument();
  });

  it("closes the dialog with Escape", () => {
    renderBoard();
    openTask("Build the board");
    expect(screen.getByRole("dialog", { name: "Task details" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

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

const initialTasks: TaskListItem[] = [
  task({ id: 1, title: "Write the brief", status: "todo", priority: "medium" }),
  task({
    id: 2,
    title: "Build the board",
    status: "doing",
    priority: "high",
    assigneeId: 1,
    assignee: { id: 1, name: "Ada Lovelace", email: "ada@bolder.local", role: "dev" },
  }),
  task({ id: 3, title: "Ship the demo", status: "done", priority: "low" }),
];

function renderBoard(tasks: TaskListItem[] = initialTasks) {
  return render(<KanbanBoard projectId="7" initialTasks={tasks} members={members} />);
}

function column(label: string): HTMLElement {
  return screen.getByRole("region", { name: label });
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
      task({ id: 10, title: "Someday idea", status: "backlog", priority: "low" }),
      ...initialTasks,
    ]);

    expect(within(column("Backlog")).getByText("Someday idea")).toBeInTheDocument();
    expect(screen.getByLabelText("1 tasks in Backlog")).toHaveTextContent("1");
    expect(screen.getByText(/1 backlog.*1 to do.*1 doing.*1 done/)).toBeInTheDocument();
  });

  it("shows the assignee name or Unassigned on each card", () => {
    renderBoard();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
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

  it("places the priority badge below the title and above the assignee row", () => {
    renderBoard();

    const card = screen.getByRole("article", { name: "Build the board" });
    const title = within(card).getByText("Build the board");
    const badge = within(card).getByText("High");
    const assignee = within(card).getByText("Ada Lovelace");
    expect(title.compareDocumentPosition(badge)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(badge.compareDocumentPosition(assignee)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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

    expect(moveTaskStatus).toHaveBeenCalledWith("7", 1, "done");
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

    expect(moveTaskStatus).toHaveBeenCalledWith("7", 1, "backlog");
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
    const created = task({ id: 9, title: "Review copy", status: "todo", priority: "high" });
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
  });

  it("creates a task preset to backlog from the column add button", async () => {
    const created = task({ id: 11, title: "Parked idea", status: "backlog", priority: "medium" });
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

  it("marks an overdue card with the danger token class", () => {
    const overdue = task({ id: 5, title: "Late report", status: "todo", dueAt: Date.now() - 3 * DAY_MS });
    renderBoard([overdue]);
    const card = screen.getByRole("article", { name: "Late report" });
    expect(within(card).getByText(/^Due /)).toHaveClass("task-due-overdue");
  });

  it("marks a task due within two days with the amber token class", () => {
    const soon = task({ id: 6, title: "Almost due", status: "todo", dueAt: Date.now() + DAY_MS });
    renderBoard([soon]);
    const card = screen.getByRole("article", { name: "Almost due" });
    expect(within(card).getByText(/^Due /)).toHaveClass("task-due-soon");
  });
});

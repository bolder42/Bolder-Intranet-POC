import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BoardMember } from "./task-types";
import { TaskForm } from "./task-form";

const members: BoardMember[] = [
  { user: { id: 1, name: "Ada Lovelace", email: "ada@bolder.local", role: "dev" } },
];

function renderCreate(onSubmit: (values: unknown) => void = vi.fn()) {
  return render(
    <TaskForm
      heading="New task"
      members={members}
      submitLabel="Create task"
      pending={false}
      serverError={null}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  );
}

describe("TaskForm", () => {
  it("submits title, description, priority, assignee and due date", () => {
    const onSubmit = vi.fn();
    renderCreate(onSubmit);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Draft notes" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Keep it short" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "high" } });
    fireEvent.change(screen.getByLabelText("Assignee"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-10-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Draft notes",
      description: "Keep it short",
      priority: "high",
      assigneeId: 1,
      dueDate: "2026-10-20",
    });
  });

  it("defaults the priority to Medium on create", () => {
    renderCreate();
    expect(screen.getByLabelText("Priority")).toHaveValue("medium");
  });

  it("asks for a title instead of submitting an empty form", () => {
    const onSubmit = vi.fn();
    const { container } = renderCreate(onSubmit);

    // Submit the form element directly: a button click would stop at native
    // `required` validation without reaching the handler.
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(screen.getByRole("alert")).toHaveTextContent("Give the task a title.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("prefills every field when editing, including the Unassigned option", () => {
    render(
      <TaskForm
        heading="Edit task"
        members={members}
        submitLabel="Save changes"
        pending={false}
        serverError={null}
        initial={{ title: "Fix login", description: "Edge case", priority: "high", assigneeId: null, dueAt: null }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Title")).toHaveValue("Fix login");
    expect(screen.getByLabelText("Description")).toHaveValue("Edge case");
    expect(screen.getByLabelText("Priority")).toHaveValue("high");
    expect(screen.getByLabelText("Assignee")).toHaveValue("");
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("requires a confirm step before deleting, mirroring the project delete UX", () => {
    const onDelete = vi.fn();
    render(
      <TaskForm
        heading="Edit task"
        members={members}
        submitLabel="Save changes"
        pending={false}
        serverError={null}
        initial={{ title: "Fix login", description: null, priority: "medium", assigneeId: 1, dueAt: null }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
      />,
    );

    expect(screen.queryByRole("button", { name: "Confirm delete" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("gives the description a comfortable box instead of a cramped one", () => {
    renderCreate();
    const textarea = screen.getByLabelText("Description") as HTMLTextAreaElement;
    expect(parseInt(textarea.style.height, 10)).toBeGreaterThanOrEqual(200);
  });

  it("treats the description as Markdown and previews it on demand", () => {
    renderCreate();

    expect(screen.getByText(/Markdown supported/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "## Plan\n\n- **ship** it" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByText("ship").tagName).toBe("STRONG");
  });

  it("keeps the Markdown source when the preview is on", () => {
    const onSubmit = vi.fn();
    renderCreate(onSubmit);

    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "**Bold**" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Draft notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "**Bold**" }));
  });
});

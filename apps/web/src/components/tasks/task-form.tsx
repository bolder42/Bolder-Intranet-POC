"use client";

import { useState } from "react";
import { Button, Input } from "@bolder/ui";
import type { TaskPriority } from "@bolder/shared";

import type { BoardMember } from "./task-types";
import { dueAtToDateInput } from "./task-utils";

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId: number | null;
  dueDate: string;
}

export interface TaskFormInitial {
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: number | null;
  dueAt: number | null;
}

export interface TaskFormProps {
  heading: string;
  members: BoardMember[];
  submitLabel: string;
  pending: boolean;
  serverError: string | null;
  initial?: TaskFormInitial | undefined;
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
  /** Present only when editing: enables the confirmed-delete section. */
  onDelete?: (() => void) | undefined;
  deleting?: boolean | undefined;
}

/**
 * Shared create/edit form. Covers every editable field except status, which
 * lives on the card (select) and in drag-and-drop. Delete mirrors the
 * two-step confirm UX of the project delete control.
 */
export function TaskForm({
  heading,
  members,
  submitLabel,
  pending,
  serverError,
  initial,
  onSubmit,
  onCancel,
  onDelete,
  deleting = false,
}: TaskFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (title === "") {
      setFormError("Give the task a title.");
      return;
    }
    setFormError(null);
    const assigneeRaw = String(data.get("assigneeId") ?? "");
    const priorityRaw = String(data.get("priority") ?? "medium");
    const priority: TaskPriority =
      priorityRaw === "low" || priorityRaw === "high" ? priorityRaw : "medium";
    onSubmit({
      title,
      description: String(data.get("description") ?? ""),
      priority,
      assigneeId: assigneeRaw === "" ? null : Number(assigneeRaw),
      dueDate: String(data.get("dueDate") ?? ""),
    });
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate={false}>
      <h2>{heading}</h2>
      <Input
        label="Title"
        name="title"
        required
        maxLength={200}
        defaultValue={initial?.title ?? ""}
        placeholder="What needs doing?"
      />
      <label className="task-form-field">
        <span>Description</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          placeholder="Any helpful detail (optional)"
        />
      </label>
      <label className="task-form-field">
        <span>Assignee</span>
        <select name="assigneeId" defaultValue={initial?.assigneeId?.toString() ?? ""}>
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.name}
            </option>
          ))}
        </select>
      </label>
      <label className="task-form-field">
        <span>Due date</span>
        <input type="date" name="dueDate" defaultValue={dueAtToDateInput(initial?.dueAt ?? null)} />
      </label>
      <label className="task-form-field">
        <span>Priority</span>
        <select name="priority" defaultValue={initial?.priority ?? "medium"}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      {formError ? (
        <p role="alert" className="task-form-error">
          {formError}
        </p>
      ) : null}
      {serverError ? (
        <p role="alert" className="task-form-error">
          {serverError}
        </p>
      ) : null}
      <div className="task-form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {onDelete ? (
        <div className="task-form-danger">
          {!confirmingDelete ? (
            <Button type="button" variant="secondary" disabled={pending || deleting} onClick={() => setConfirmingDelete(true)}>
              Delete task
            </Button>
          ) : (
            <div>
              <p>Delete this task? This cannot be undone.</p>
              <div className="task-form-actions">
                <Button type="button" disabled={deleting} onClick={onDelete}>
                  {deleting ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={deleting}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Keep task
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}

"use client";

import { useId } from "react";
import { Button } from "@bolder/ui";

import { Markdown } from "./markdown";
import type { TaskListItem } from "./task-types";
import {
  dueTone,
  formatCreatedAt,
  formatDueDate,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "./task-utils";

export interface TaskDetailProps {
  task: TaskListItem;
  /** Creation ordinal inside the project: 1 = the first task of the project. */
  number: number;
  /** Opens the edit form for this task. */
  onEdit: (task: TaskListItem) => void;
  /** Closes the detail view. */
  onClose: () => void;
}

/**
 * Read-only detail view for a task.
 *
 * It reads like a document, not a form: the description is the page, and
 * the facts about the task (status, priority, owner, dates) sit in a narrow
 * panel beside it. The only way out of it (besides closing) is the
 * "Edit task" button, which hands the same task over to the edit form.
 */
export function TaskDetail({ task, number, onEdit, onClose }: TaskDetailProps) {
  const priority = task.priority ?? "medium";
  const hasDescription = task.description !== null && task.description.trim() !== "";
  const tone = dueTone(task.dueAt);
  const dueClass =
    tone === "overdue" ? "task-due task-due-overdue" : tone === "soon" ? "task-due task-due-soon" : "";
  // The two panels are named by their own headings, so the description
  // section and the facts panel are landmarks of the dialog.
  const descriptionLabelId = useId();
  const detailsLabelId = useId();

  return (
    <div className="task-detail">
      <header className="task-detail-head">
        <div className="task-detail-headline">
          {number > 0 ? <span className="task-detail-number">#{number}</span> : null}
          <h2 className="task-detail-title">{task.title}</h2>
        </div>
        <button
          type="button"
          className="task-detail-close"
          onClick={onClose}
          aria-label="Close task details"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="task-detail-columns">
        <section className="task-detail-card" aria-labelledby={descriptionLabelId}>
          <h3 id={descriptionLabelId} className="task-detail-section">
            Description
          </h3>
          {hasDescription ? (
            <Markdown className="task-detail-prose">{task.description ?? ""}</Markdown>
          ) : (
            <p className="task-detail-empty">
              No description yet. Use “Edit task” to add the details.
            </p>
          )}
        </section>

        <aside className="task-detail-card task-detail-side" aria-labelledby={detailsLabelId}>
          <h3 id={detailsLabelId} className="task-detail-section">
            Details
          </h3>
          <dl className="task-detail-facts">
            <div className="task-detail-fact">
              <dt>Status</dt>
              <dd>
                <span className={`kanban-dot kanban-dot-${task.status}`} aria-hidden="true" />
                {STATUS_LABELS[task.status]}
              </dd>
            </div>
            <div className="task-detail-fact">
              <dt>Priority</dt>
              <dd>
                <span className={`task-priority task-priority-${priority}`}>
                  {PRIORITY_LABELS[priority]}
                </span>
              </dd>
            </div>
            <div className="task-detail-fact">
              <dt>Assignee</dt>
              <dd>{task.assignee ? task.assignee.name : "Unassigned"}</dd>
            </div>
            <div className="task-detail-fact">
              <dt>Due date</dt>
              <dd className={dueClass}>
                {task.dueAt !== null ? formatDueDate(task.dueAt) : "No due date"}
              </dd>
            </div>
            <div className="task-detail-fact">
              <dt>Created</dt>
              <dd>{formatCreatedAt(task.createdAt)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <footer className="task-detail-actions">
        <Button type="button" onClick={() => onEdit(task)}>
          Edit task
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </footer>
    </div>
  );
}

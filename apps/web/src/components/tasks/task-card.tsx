"use client";

import type { TaskStatus } from "@bolder/shared";

import type { TaskListItem } from "./task-types";
import { dueTone, formatDueDate, PRIORITY_LABELS, STATUS_COLUMNS } from "./task-utils";

export interface TaskCardProps {
  task: TaskListItem;
  dragging: boolean;
  onDragStart: (taskId: number | null) => void;
  onMove: (taskId: number, status: TaskStatus) => void;
  onOpen: (task: TaskListItem) => void;
}

/**
 * A single kanban card. The title button opens the edit form; the status
 * select is the keyboard-accessible way to move the card between columns and
 * performs the same move as drag-and-drop.
 */
export function TaskCard({ task, dragging, onDragStart, onMove, onOpen }: TaskCardProps) {
  const tone = dueTone(task.dueAt);
  const dueClass =
    tone === "overdue" ? "task-due task-due-overdue" : tone === "soon" ? "task-due task-due-soon" : "task-due";
  const priority = task.priority ?? "medium";

  return (
    <article
      className={`task-card task-card-status-${task.status}${dragging ? " task-card-dragging" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(task.id));
        onDragStart(task.id);
      }}
      onDragEnd={() => onDragStart(null)}
      aria-label={task.title}
    >
      <button type="button" className="task-card-title" onClick={() => onOpen(task)}>
        {task.title}
      </button>
      <span className={`task-priority task-priority-${priority}`}>{PRIORITY_LABELS[priority]}</span>
      {task.description ? <p className="task-card-desc">{task.description}</p> : null}
      <p className="task-card-meta">
        <span className="task-assignee">{task.assignee ? task.assignee.name : "Unassigned"}</span>
        {task.dueAt !== null ? (
          <span className={dueClass}>Due {formatDueDate(task.dueAt)}</span>
        ) : (
          <span className="task-due task-due-none">No due date</span>
        )}
      </p>
      <label className="task-card-move">
        <span>Move to</span>
        <select
          aria-label={`Move ${task.title} to another stage`}
          value={task.status}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onMove(task.id, event.target.value as TaskStatus)}
        >
          {STATUS_COLUMNS.map((column) => (
            <option key={column.key} value={column.key}>
              {column.label}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

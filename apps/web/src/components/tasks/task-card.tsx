"use client";

import { useRef } from "react";
import type { TaskStatus } from "@bolder/shared";

import type { TaskListItem } from "./task-types";
import { PRIORITY_LABELS, STATUS_COLUMNS } from "./task-utils";

export interface TaskCardProps {
  task: TaskListItem;
  /** Creation ordinal inside the project: 1 = the first task of the project. */
  number: number;
  dragging: boolean;
  onDragStart: (taskId: number | null) => void;
  onMove: (taskId: number, status: TaskStatus) => void;
  onOpen: (task: TaskListItem) => void;
}

/**
 * A single kanban card.
 *
 * The card is intentionally quiet: task number, title and the priority
 * flag — the description lives in the detail view, not on the board. The
 * status select is the keyboard-accessible way to move the card between
 * columns and performs the same move as drag-and-drop.
 */
export function TaskCard({ task, number, dragging, onDragStart, onMove, onOpen }: TaskCardProps) {
  const priority = task.priority ?? "medium";
  // A finished drag must not be read as a click, or dropping a card would
  // open the detail view on top of the board.
  const dragEndedAt = useRef(0);

  function handleCardClick(): void {
    if (Date.now() - dragEndedAt.current < 300) return;
    onOpen(task);
  }

  return (
    <article
      className={`task-card task-card-status-${task.status}${dragging ? " task-card-dragging" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(task.id));
        onDragStart(task.id);
      }}
      onDragEnd={() => {
        dragEndedAt.current = Date.now();
        onDragStart(null);
      }}
      onClick={handleCardClick}
      aria-label={task.title}
    >
      <div className="task-card-top">
        {number > 0 ? <span className="task-card-number">#{number}</span> : null}
        <span className={`task-priority task-priority-${priority}`}>{PRIORITY_LABELS[priority]}</span>
      </div>
      <h3 className="task-card-heading">
        <button
          type="button"
          className="task-card-title"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(task);
          }}
        >
          {task.title}
        </button>
        {/* Hidden until hover/focus: the card opens the read-only detail. */}
        <span className="task-card-open" aria-hidden="true">
          →
        </span>
      </h3>
      <label className="task-card-move" onClick={(event) => event.stopPropagation()}>
        <span>Move to</span>
        <select
          aria-label={`Move ${task.title} to another stage`}
          value={task.status}
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

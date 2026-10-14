"use client";

import { useMemo, useState } from "react";
import { Button } from "@bolder/ui";
import type { TaskStatus } from "@bolder/shared";

import type { BoardMember, TaskListItem } from "./task-types";
import { groupByStatus, STATUS_COLUMNS, taskCounts } from "./task-utils";
import { dateInputToDueAt } from "./task-utils";
import { createTask, deleteTask, listTasks, moveTaskStatus, updateTask } from "./tasks-api";
import type { TaskFormValues } from "./task-form";
import { TaskForm } from "./task-form";
import { TaskCard } from "./task-card";
import "./kanban.css";

export interface KanbanBoardProps {
  projectId: string;
  initialTasks: TaskListItem[];
  members: BoardMember[];
}

type DialogState =
  | { mode: "create"; status: TaskStatus }
  | { mode: "edit"; task: TaskListItem }
  | null;

function valuesToCreatePayload(values: TaskFormValues, status: TaskStatus) {
  return {
    title: values.title,
    description: values.description === "" ? undefined : values.description,
    status,
    priority: values.priority,
    assigneeId: values.assigneeId,
    dueAt: dateInputToDueAt(values.dueDate),
  };
}

/**
 * Client kanban board. The server page fetches the first paint; every move,
 * create, edit, delete and retry below runs against the typed Tasks RPC with
 * optimistic updates and rollback on failure.
 */
export function KanbanBoard({ projectId, initialTasks, members }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskListItem[]>(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const groups = useMemo(() => groupByStatus(tasks), [tasks]);
  const counts = useMemo(() => taskCounts(tasks), [tasks]);
  const editingTask =
    dialog?.mode === "edit" ? tasks.find((task) => task.id === dialog.task.id) ?? dialog.task : null;

  function readDropId(event: React.DragEvent): number | null {
    const raw = event.dataTransfer.getData("text/plain");
    const id = Number(raw);
    if (raw.trim() === "" || Number.isNaN(id)) return draggedId;
    return id;
  }

  async function handleMove(taskId: number, status: TaskStatus): Promise<void> {
    const current = tasks.find((task) => task.id === taskId);
    if (!current || current.status === status) return;
    const snapshot = tasks;
    setTasks(snapshot.map((task) => (task.id === taskId ? { ...task, status } : task)));
    setError(null);
    try {
      const updated = await moveTaskStatus(projectId, taskId, status);
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
    } catch {
      setTasks(snapshot);
      setError("Could not move the task. It was put back where it was.");
    }
  }

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    setError(null);
    try {
      setTasks(await listTasks(projectId));
    } catch {
      setError("Could not load tasks. Check your connection and try again.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreate(values: TaskFormValues, status: TaskStatus): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const created = await createTask(projectId, valuesToCreatePayload(values, status));
      setTasks((prev) => [...prev, created]);
      setDialog(null);
    } catch {
      setError("Could not create the task. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(taskId: number, values: TaskFormValues): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTask(projectId, taskId, {
        title: values.title,
        description: values.description === "" ? null : values.description,
        priority: values.priority,
        assigneeId: values.assigneeId,
        dueAt: dateInputToDueAt(values.dueDate),
      });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
      setDialog(null);
    } catch {
      setError("Could not save the task. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(taskId: number): Promise<void> {
    setDeleting(true);
    setError(null);
    try {
      await deleteTask(projectId, taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setDialog(null);
    } catch {
      setError("Could not delete the task. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="kanban" aria-label="Tasks board">
      <div className="kanban-top">
        <div>
          <h1>Tasks</h1>
          <p className="kanban-sub">Track work across four simple stages.</p>
        </div>
        <Button type="button" onClick={() => setDialog({ mode: "create", status: "todo" })}>
          New task
        </Button>
      </div>

      {error ? (
        <div className="kanban-error" role="alert">
          <p>{error}</p>
          <Button type="button" variant="secondary" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : null}

      <div className="kanban-summary" aria-label="Progress summary">
        <p className="kanban-summary-text">
          <strong>
            {counts.done} of {counts.total} done
          </strong>
          <span aria-hidden="true"> · </span>
          <span>
            {groups.backlog.length} backlog · {groups.todo.length} to do · {groups.doing.length} doing ·{" "}
            {groups.done.length} done
          </span>
        </p>
        <div
          className="kanban-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={counts.percent}
          aria-label={`${counts.percent} percent complete`}
        >
          <div className="kanban-progress-fill" style={{ width: `${counts.percent}%` }} />
        </div>
      </div>

      {refreshing ? (
        <p className="kanban-loading" role="status">
          Loading tasks…
        </p>
      ) : null}

      <div className="kanban-columns">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = groups[column.key];
          return (
            <section
              key={column.key}
              aria-label={column.label}
              className={`kanban-column kanban-column-${column.key}${
                dropTarget === column.key ? " kanban-column-drop" : ""
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(column.key);
              }}
              onDragLeave={() => setDropTarget((prev) => (prev === column.key ? null : prev))}
              onDrop={(event) => {
                event.preventDefault();
                const id = readDropId(event);
                setDropTarget(null);
                setDraggedId(null);
                if (id !== null) void handleMove(id, column.key);
              }}
            >
              <header className="kanban-column-head">
                <span className={`kanban-dot kanban-dot-${column.key}`} aria-hidden="true" />
                <h2>{column.label}</h2>
                <span className="kanban-count" aria-label={`${columnTasks.length} tasks in ${column.label}`}>
                  {columnTasks.length}
                </span>
                <button
                  type="button"
                  className="kanban-add"
                  aria-label={`Add a task to ${column.label}`}
                  onClick={() => setDialog({ mode: "create", status: column.key })}
                >
                  +
                </button>
              </header>
              <div className="kanban-cards">
                {columnTasks.length === 0 ? (
                  <p className="kanban-empty">No tasks yet.</p>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      dragging={draggedId === task.id}
                      onDragStart={setDraggedId}
                      onMove={(taskId, status) => void handleMove(taskId, status)}
                      onOpen={(open) => setDialog({ mode: "edit", task: open })}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {dialog ? (
        <div className="kanban-overlay" onClick={() => (saving || deleting ? null : setDialog(null))}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={dialog.mode === "create" ? "Create task" : "Edit task"}
            className="kanban-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            {dialog.mode === "create" ? (
              <TaskForm
                heading="New task"
                members={members}
                submitLabel="Create task"
                pending={saving}
                serverError={null}
                onSubmit={(values) => void handleCreate(values, dialog.status)}
                onCancel={() => setDialog(null)}
              />
            ) : editingTask ? (
              <TaskForm
                heading="Edit task"
                members={members}
                submitLabel="Save changes"
                pending={saving}
                serverError={null}
                initial={{
                  title: editingTask.title,
                  description: editingTask.description,
                  priority: editingTask.priority ?? "medium",
                  assigneeId: editingTask.assigneeId,
                  dueAt: editingTask.dueAt,
                }}
                onSubmit={(values) => void handleUpdate(editingTask.id, values)}
                onCancel={() => setDialog(null)}
                onDelete={() => void handleDelete(editingTask.id)}
                deleting={deleting}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

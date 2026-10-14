import type { TaskPriority, TaskStatus } from "@bolder/shared";

import type { TaskListItem } from "./task-types";

export interface StatusColumn {
  key: TaskStatus;
  label: string;
}

/** Kanban stays minimal for the POC: Backlog / To Do / Doing / Done. */
export const STATUS_COLUMNS: StatusColumn[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To Do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

/** Display labels for the per-task priority flag (default: Medium). */
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function groupByStatus(tasks: TaskListItem[]): Record<TaskStatus, TaskListItem[]> {
  const groups: Record<TaskStatus, TaskListItem[]> = { backlog: [], todo: [], doing: [], done: [] };
  for (const task of tasks) {
    groups[task.status].push(task);
  }
  return groups;
}

export interface TaskCounts {
  total: number;
  done: number;
  percent: number;
}

export function taskCounts(tasks: TaskListItem[]): TaskCounts {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export type DueTone = "overdue" | "soon" | "none";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/**
 * Pure date-based tone for the due-date line. Overdue (past days) renders in
 * the danger token; due within the next two days renders in amber.
 */
export function dueTone(dueAt: number | null): DueTone {
  if (dueAt === null) return "none";
  if (dueAt < startOfToday()) return "overdue";
  if (dueAt - Date.now() <= 2 * DAY_MS) return "soon";
  return "none";
}

/** Due dates are shown in pt-BR day/month/year form. */
export function formatDueDate(dueAt: number): string {
  return new Date(dueAt).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** `<input type="date">` value (yyyy-mm-dd) for a stored timestamp. */
export function dueAtToDateInput(dueAt: number | null): string {
  if (dueAt === null) return "";
  return new Date(dueAt).toISOString().slice(0, 10);
}

/** Date-input value back to a UTC-midnight timestamp, or null when empty. */
export function dateInputToDueAt(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

import type { ScheduleItem } from "@bolder/shared";

/** Formats a timestamp as a `yyyy-mm-dd` key in UTC. */
export function toDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Formats a timestamp as a `yyyy-mm` month key in UTC. */
export function toMonthKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 7);
}

/** Human-readable calendar date, always rendered in UTC. */
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { timeZone: "UTC" });
}

/** Human-readable month label, e.g. `November 2026`. */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (monthNumber ?? 1) - 1, 1)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

/** Returns the `yyyy-mm` key `delta` months away from `month`. */
export function addMonths(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (monthNumber ?? 1) - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export interface CalendarDay {
  /** `yyyy-mm-dd` key in UTC. */
  key: string;
  day: number;
  inMonth: boolean;
}

/**
 * Builds a fixed six-week (42 day) grid, padded with the trailing days of the
 * previous month and the leading days of the next one. Weeks start on Monday.
 */
export function buildMonthGrid(month: string): CalendarDay[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year ?? 0, (monthNumber ?? 1) - 1, 1));
  const offset = (firstOfMonth.getUTCDay() + 6) % 7; // Monday = 0
  const start = Date.UTC(year ?? 0, (monthNumber ?? 1) - 1, 1 - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start + index * 86_400_000);
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === (monthNumber ?? 1) - 1,
    };
  });
}

export interface ScheduleGroups {
  overdue: ScheduleItem[];
  upcoming: ScheduleItem[];
  past: ScheduleItem[];
}

/**
 * Splits items into overdue deadlines, upcoming items and past milestones.
 * `today` is a `yyyy-mm-dd` UTC key; ISO date strings compare lexicographically.
 */
export function groupScheduleItems(items: ScheduleItem[], today: string): ScheduleGroups {
  const overdue: ScheduleItem[] = [];
  const upcoming: ScheduleItem[] = [];
  const past: ScheduleItem[] = [];

  for (const item of items) {
    if (toDateKey(item.dueAt) >= today) upcoming.push(item);
    else if (item.kind === "deadline") overdue.push(item);
    else past.push(item);
  }

  upcoming.sort((a, b) => a.dueAt - b.dueAt);
  overdue.sort((a, b) => b.dueAt - a.dueAt);
  past.sort((a, b) => b.dueAt - a.dueAt);

  return { overdue, upcoming, past };
}

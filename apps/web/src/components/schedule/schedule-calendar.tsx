"use client";

import { useState } from "react";
import type { ScheduleItem } from "@bolder/shared";
import { Button } from "@/components/ui";

import { addMonths, buildMonthGrid, formatMonth, toDateKey, toMonthKey } from "./format";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ScheduleCalendarProps {
  items: ScheduleItem[];
  /** `yyyy-mm-dd` UTC key for "today", supplied by the server to avoid hydration drift. */
  today: string;
  canCreate?: boolean;
  onSelectDay?: (dateKey: string) => void;
}

/**
 * Hand-rolled monthly grid (no calendar dependencies). Days carrying items show
 * chips colored by kind; when `canCreate` is set, clicking a day asks the parent
 * to open the create form for that date.
 */
export function ScheduleCalendar({
  items,
  today,
  canCreate = false,
  onSelectDay,
}: ScheduleCalendarProps) {
  const [month, setMonth] = useState(() => toMonthKey(Date.parse(`${today}T00:00:00Z`)));
  const days = buildMonthGrid(month);

  const byDay = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = toDateKey(item.dueAt);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
    else byDay.set(key, [item]);
  }

  return (
    <section className="schedule-calendar" aria-label="Schedule calendar">
      <div className="schedule-calendar-header">
        <Button
          type="button"
          variant="secondary"
          aria-label="Previous month"
          onClick={() => setMonth((current) => addMonths(current, -1))}
        >
          ‹
        </Button>
        <h2 className="schedule-calendar-month">{formatMonth(month)}</h2>
        <Button
          type="button"
          variant="secondary"
          aria-label="Next month"
          onClick={() => setMonth((current) => addMonths(current, 1))}
        >
          ›
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setMonth(toMonthKey(Date.parse(`${today}T00:00:00Z`)))}
        >
          Today
        </Button>
      </div>

      <div className="schedule-calendar-grid">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="schedule-calendar-weekday">
            {weekday}
          </div>
        ))}

        {days.map((cell) => {
          const dayItems = byDay.get(cell.key) ?? [];
          const className = [
            "schedule-day",
            cell.inMonth ? "" : "schedule-day-outside",
            cell.key === today ? "schedule-day-today" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const content = (
            <>
              <span className="schedule-day-number">{cell.day}</span>
              {dayItems.map((item) => (
                <span
                  key={item.id}
                  className={`schedule-chip schedule-chip-${item.kind}`}
                  title={`${item.kind}: ${item.title}`}
                >
                  {item.title}
                </span>
              ))}
            </>
          );

          return canCreate ? (
            <button
              key={cell.key}
              type="button"
              className={className}
              aria-label={`New item on ${cell.key}`}
              onClick={() => onSelectDay?.(cell.key)}
            >
              {content}
            </button>
          ) : (
            <div key={cell.key} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

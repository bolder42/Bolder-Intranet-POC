import type { ScheduleItem } from "@bolder/shared";
import { describe, expect, it } from "vitest";

import { buildMonthGrid, formatMonth, groupScheduleItems, toDateKey } from "./format";

function item(
  partial: Partial<ScheduleItem> & Pick<ScheduleItem, "id" | "kind" | "dueAt">,
): ScheduleItem {
  return { projectId: 1, title: `Item ${partial.id}`, description: null, ...partial };
}

describe("schedule format helpers", () => {
  it("formats a timestamp as a UTC date key", () => {
    expect(toDateKey(Date.UTC(2026, 10, 6))).toBe("2026-11-06");
  });

  it("groups items into overdue, upcoming and past by kind", () => {
    const today = "2026-11-06";
    const groups = groupScheduleItems(
      [
        item({ id: 1, kind: "deadline", dueAt: Date.UTC(2026, 10, 1) }), // missed deadline
        item({ id: 2, kind: "milestone", dueAt: Date.UTC(2026, 9, 1) }), // past milestone
        item({ id: 3, kind: "deadline", dueAt: Date.UTC(2026, 10, 10) }), // upcoming
        item({ id: 4, kind: "milestone", dueAt: Date.UTC(2026, 10, 6) }), // upcoming (today)
      ],
      today,
    );

    expect(groups.overdue.map((entry) => entry.id)).toEqual([1]);
    expect(groups.past.map((entry) => entry.id)).toEqual([2]);
    expect(groups.upcoming.map((entry) => entry.id)).toEqual([4, 3]);
  });

  it("builds a fixed six-week grid starting on the Monday before the month", () => {
    const grid = buildMonthGrid("2026-11");
    expect(grid).toHaveLength(42);
    // Nov 1 2026 is a Sunday, so the grid opens on Monday Oct 26.
    expect(grid[0]?.key).toBe("2026-10-26");
    expect(grid.find((day) => day.key === "2026-11-01")?.inMonth).toBe(true);
    expect(grid[0]?.inMonth).toBe(false);
  });

  it("renders a readable month label", () => {
    expect(formatMonth("2026-11")).toBe("November 2026");
  });
});

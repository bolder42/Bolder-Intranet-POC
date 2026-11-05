import type { ScheduleItem } from "@bolder/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { ScheduleCalendar } from "./schedule-calendar";

const items: ScheduleItem[] = [
  {
    id: 1,
    projectId: 1,
    title: "Launch",
    kind: "deadline",
    dueAt: Date.UTC(2026, 10, 6),
    description: null,
  },
];

it("shows items in the month grid and navigates between months", () => {
  render(<ScheduleCalendar items={items} today="2026-11-01" />);

  expect(screen.getByText("November 2026")).toBeInTheDocument();
  expect(screen.getByText("Launch")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByText("December 2026")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Today" }));
  expect(screen.getByText("November 2026")).toBeInTheDocument();
});

it("calls onSelectDay with the clicked date when creation is enabled", () => {
  const onSelectDay = vi.fn();
  render(<ScheduleCalendar items={[]} today="2026-11-01" canCreate onSelectDay={onSelectDay} />);

  fireEvent.click(screen.getByRole("button", { name: "New item on 2026-11-06" }));
  expect(onSelectDay).toHaveBeenCalledWith("2026-11-06");
});

it("renders read-only days when creation is disabled", () => {
  render(<ScheduleCalendar items={[]} today="2026-11-01" />);
  expect(screen.queryByRole("button", { name: /New item on/ })).not.toBeInTheDocument();
});

it("caps chips per day and reports the hidden count", () => {
  const busy: ScheduleItem[] = Array.from({ length: 5 }, (_, index) => ({
    id: 10 + index,
    projectId: 1,
    title: `Task ${index + 1}`,
    kind: "milestone" as const,
    dueAt: Date.UTC(2026, 10, 6),
    description: null,
  }));

  render(<ScheduleCalendar items={busy} today="2026-11-01" />);

  expect(screen.getByText("Task 1")).toBeInTheDocument();
  expect(screen.getByText("Task 3")).toBeInTheDocument();
  expect(screen.queryByText("Task 4")).not.toBeInTheDocument();
  expect(screen.getByText("+2 more")).toBeInTheDocument();
});

it("shows no overflow label when a day fits within the chip cap", () => {
  const three: ScheduleItem[] = Array.from({ length: 3 }, (_, index) => ({
    id: 20 + index,
    projectId: 1,
    title: `Small ${index + 1}`,
    kind: "milestone" as const,
    dueAt: Date.UTC(2026, 10, 6),
    description: null,
  }));

  render(<ScheduleCalendar items={three} today="2026-11-01" />);

  expect(screen.queryByText(/more/)).not.toBeInTheDocument();
});

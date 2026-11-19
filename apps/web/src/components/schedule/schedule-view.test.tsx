import type { ScheduleItem } from "@bolder/shared";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/app/app/projects/[projectId]/schedule/actions", () => ({
  saveScheduleItem: vi.fn(),
  deleteScheduleItemAction: vi.fn(),
}));

import { ScheduleView } from "./schedule-view";

it("opens the create form prefilled with a clicked calendar day", () => {
  render(<ScheduleView projectId="1" items={[]} today="2026-11-01" canWrite />);

  expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "New item on 2026-11-06" }));
  expect(screen.getByLabelText("Title")).toBeInTheDocument();
  expect(screen.getByLabelText("Date")).toHaveValue("2026-11-06");
});

it("hides write affordances from readers", () => {
  render(<ScheduleView projectId="1" items={[]} today="2026-11-01" canWrite={false} />);

  expect(screen.queryByRole("button", { name: "New item" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /New item on/ })).not.toBeInTheDocument();
});

const filteredItems: ScheduleItem[] = [
  {
    id: 1,
    projectId: 1,
    title: "Alpha milestone",
    kind: "milestone",
    dueAt: Date.UTC(2026, 10, 6),
    description: null,
  },
  {
    id: 2,
    projectId: 1,
    title: "Beta deadline",
    kind: "deadline",
    dueAt: Date.UTC(2026, 10, 6),
    description: null,
  },
];

it("applies the type filter to both the calendar and the list for readers", () => {
  render(
    <ScheduleView projectId="1" items={filteredItems} today="2026-11-01" canWrite={false} />,
  );

  expect(screen.getAllByText("Alpha milestone")).toHaveLength(2);
  expect(screen.getAllByText("Beta deadline")).toHaveLength(2);

  fireEvent.click(screen.getByRole("button", { name: "Deadlines" }));

  expect(screen.queryByText("Alpha milestone")).not.toBeInTheDocument();
  expect(screen.getAllByText("Beta deadline")).toHaveLength(2);
});

it("searches items and resets list pagination when the query changes", () => {
  const many: ScheduleItem[] = Array.from({ length: 7 }, (_, index) => ({
    id: 10 + index,
    projectId: 1,
    title: `Release step ${index + 1}`,
    kind: "milestone" as const,
    dueAt: Date.UTC(2026, 10, 8 + index),
    description: null,
  }));
  const { container } = render(
    <ScheduleView projectId="1" items={many} today="2026-11-01" canWrite={false} />,
  );

  const nav = screen.getByRole("navigation", { name: "Upcoming pagination" });
  fireEvent.click(within(nav).getByRole("button", { name: "Next" }));
  expect(screen.getAllByText("Release step 6")).toHaveLength(2);

  fireEvent.change(screen.getByRole("searchbox", { name: "Search schedule items" }), {
    target: { value: "step 1" },
  });

  expect(screen.queryByRole("navigation", { name: "Upcoming pagination" })).not.toBeInTheDocument();
  expect(screen.getAllByText("Release step 1")).toHaveLength(2);
  expect(screen.queryAllByText("Release step 6")).toHaveLength(0);
  expect(container.querySelectorAll(".schedule-item")).toHaveLength(1);
});

import type { ScheduleItem } from "@bolder/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/app/app/projects/[projectId]/schedule/actions", () => ({
  deleteScheduleItemAction: vi.fn(),
}));

import { ScheduleList } from "./schedule-list";

const items: ScheduleItem[] = [
  {
    id: 1,
    projectId: 1,
    title: "Missed release",
    kind: "deadline",
    dueAt: Date.UTC(2026, 10, 1),
    description: "Was due last week",
  },
  {
    id: 2,
    projectId: 1,
    title: "Beta",
    kind: "milestone",
    dueAt: Date.UTC(2026, 10, 10),
    description: null,
  },
  {
    id: 3,
    projectId: 1,
    title: "Kickoff done",
    kind: "milestone",
    dueAt: Date.UTC(2026, 9, 1),
    description: null,
  },
];

it("groups items into overdue, upcoming and past sections", () => {
  render(<ScheduleList projectId="1" items={items} today="2026-11-06" />);

  expect(screen.getByRole("heading", { name: "Overdue" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Upcoming" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Past" })).toBeInTheDocument();
  expect(screen.getByText("Missed release")).toBeInTheDocument();
  expect(screen.getByText("Beta")).toBeInTheDocument();
  expect(screen.getByText("Kickoff done")).toBeInTheDocument();
});

it("hides edit and delete controls from readers", () => {
  render(<ScheduleList projectId="1" items={items} today="2026-11-06" />);
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
});

it("invokes onEdit for writers", () => {
  const onEdit = vi.fn();
  render(<ScheduleList projectId="1" items={items} today="2026-11-06" canWrite onEdit={onEdit} />);

  fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
  expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
});

it("shows an empty state when there are no items", () => {
  render(<ScheduleList projectId="1" items={[]} today="2026-11-06" />);
  expect(screen.getByText("No milestones or deadlines yet.")).toBeInTheDocument();
});

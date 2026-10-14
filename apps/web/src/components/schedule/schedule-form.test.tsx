import type { ScheduleItem } from "@bolder/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/app/app/projects/[projectId]/schedule/actions", () => ({
  saveScheduleItem: vi.fn(),
}));

import { ScheduleForm } from "./schedule-form";

const existing: ScheduleItem = {
  id: 7,
  projectId: 1,
  title: "Launch",
  kind: "deadline",
  dueAt: Date.UTC(2026, 10, 6),
  description: "Ship it",
};

it("prefills the date chosen on the calendar when creating", () => {
  render(<ScheduleForm projectId="1" defaultDate="2026-11-20" />);
  expect(screen.getByLabelText("Date")).toHaveValue("2026-11-20");
  expect(screen.getByLabelText("Title")).toHaveValue("");
  expect(screen.getByLabelText("Type")).toHaveValue("milestone");
});

it("prefills an existing item for editing", () => {
  render(<ScheduleForm projectId="1" item={existing} />);
  expect(screen.getByLabelText("Title")).toHaveValue("Launch");
  expect(screen.getByLabelText("Type")).toHaveValue("deadline");
  expect(screen.getByLabelText("Date")).toHaveValue("2026-11-06");
  expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
});

it("lets the user cancel an open form", () => {
  const onDone = vi.fn();
  render(<ScheduleForm projectId="1" onDone={onDone} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onDone).toHaveBeenCalled();
});

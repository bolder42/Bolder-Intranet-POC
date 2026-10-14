import { fireEvent, render, screen } from "@testing-library/react";
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

import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { ScheduleFilters } from "./schedule-filters";

it("reports the selected type filter and lets the user change it", () => {
  const onKindChange = vi.fn();
  render(
    <ScheduleFilters kind="all" query="" onKindChange={onKindChange} onQueryChange={vi.fn()} />,
  );

  const all = screen.getByRole("button", { name: "All types" });
  expect(all).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Milestones" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  fireEvent.click(screen.getByRole("button", { name: "Deadlines" }));
  expect(onKindChange).toHaveBeenCalledWith("deadline");
});

it("emits the search query as the user types", () => {
  const onQueryChange = vi.fn();
  render(
    <ScheduleFilters kind="all" query="" onKindChange={vi.fn()} onQueryChange={onQueryChange} />,
  );

  fireEvent.change(screen.getByRole("searchbox", { name: "Search schedule items" }), {
    target: { value: "beta" },
  });
  expect(onQueryChange).toHaveBeenCalledWith("beta");
});

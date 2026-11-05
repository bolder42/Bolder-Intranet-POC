import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { SchedulePagination } from "./schedule-pagination";

it("renders nothing when there is a single page", () => {
  const { container } = render(
    <SchedulePagination
      label="Upcoming pagination"
      page={1}
      totalPages={1}
      onPageChange={vi.fn()}
    />,
  );

  expect(container).toBeEmptyDOMElement();
});

it("moves between pages and disables the edges", () => {
  const onPageChange = vi.fn();
  const { rerender } = render(
    <SchedulePagination
      label="Upcoming pagination"
      page={1}
      totalPages={2}
      onPageChange={onPageChange}
    />,
  );

  let nav = screen.getByRole("navigation", { name: "Upcoming pagination" });
  expect(within(nav).getByText("Page 1 of 2")).toBeInTheDocument();
  expect(within(nav).getByRole("button", { name: "Previous" })).toBeDisabled();

  fireEvent.click(within(nav).getByRole("button", { name: "Next" }));
  expect(onPageChange).toHaveBeenCalledWith(2);

  rerender(
    <SchedulePagination
      label="Upcoming pagination"
      page={2}
      totalPages={2}
      onPageChange={onPageChange}
    />,
  );

  nav = screen.getByRole("navigation", { name: "Upcoming pagination" });
  expect(within(nav).getByText("Page 2 of 2")).toBeInTheDocument();
  expect(within(nav).getByRole("button", { name: "Next" })).toBeDisabled();

  fireEvent.click(within(nav).getByRole("button", { name: "Previous" }));
  expect(onPageChange).toHaveBeenCalledWith(1);
});

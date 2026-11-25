import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TasksWidget } from "./tasks-widget";

it("strikes through a task when checked and restores it when unchecked", () => {
  render(<TasksWidget totalCount={3} />);
  const title = screen.getByText("Review project brief");
  fireEvent.click(screen.getByRole("checkbox", { name: "Mark Review project brief as done" }));
  expect(title).toHaveStyle({ textDecoration: "line-through" });
  const checkbox = screen.getByRole("checkbox", { name: "Mark Review project brief as not done" });
  expect(checkbox).toBeChecked();
  fireEvent.click(checkbox);
  expect(title.style.textDecoration).toBe("");
});

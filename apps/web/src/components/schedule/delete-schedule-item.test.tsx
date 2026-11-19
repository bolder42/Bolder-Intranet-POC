import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/app/app/projects/[projectId]/schedule/actions", () => ({
  deleteScheduleItemAction: vi.fn(),
}));

import { DeleteScheduleItem } from "./delete-schedule-item";

it("asks for confirmation before submitting and can be cancelled", () => {
  const { container } = render(
    <DeleteScheduleItem projectId="1" itemId={7} itemTitle="Beta release" />,
  );

  expect(screen.queryByText("Delete “Beta release”?")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(screen.getByText("Delete “Beta release”?")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute("type", "submit");
  expect(container.querySelector<HTMLInputElement>('input[name="itemId"]')?.value).toBe("7");
  expect(container.querySelector<HTMLInputElement>('input[name="projectId"]')?.value).toBe("1");

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByText("Delete “Beta release”?")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
});

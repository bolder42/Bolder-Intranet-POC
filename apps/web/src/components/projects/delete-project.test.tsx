import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@/app/app/projects/actions", () => ({ deleteProjectAction: vi.fn() }));
import { DeleteProject } from "./delete-project";

it("requires confirmation and lets the user cancel without deleting", () => {
  render(<DeleteProject projectId={4} projectName="Apollo" />);
  expect(screen.queryByRole("button", { name: "Confirm deletion" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
  expect(screen.getByText(/Apollo/)).toHaveTextContent(/permanently deleted/);
  expect(screen.getByRole("button", { name: "Confirm deletion" })).toHaveAttribute(
    "type",
    "submit",
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("button", { name: "Confirm deletion" })).not.toBeInTheDocument();
});

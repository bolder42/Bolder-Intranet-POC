import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Participants } from "./participants";

it("shows a compact team summary and expandable public participant details", () => {
  render(
    <Participants
      members={[
        {
          id: 1,
          projectId: 1,
          userId: 2,
          joinedAt: 0,
          user: { id: 2, name: "Ada", email: "ada@bolder.local", role: "dev" },
        },
      ]}
    />,
  );
  const summary = screen.getByText("1 participants · Ada");
  const details = summary.closest("details");
  expect(details).not.toHaveAttribute("open");
  fireEvent.click(summary);
  expect(screen.getByText(/ada@bolder.local/)).toBeInTheDocument();
});

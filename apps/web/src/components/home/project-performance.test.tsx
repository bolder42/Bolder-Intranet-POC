import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProjectPerformance } from "./project-performance";

it("shows real project progress and participant workload with a project link", () => {
  render(
    <ProjectPerformance
      global={false}
      data={{
        projects: [
          {
            id: 1,
            name: "Apollo",
            deadline: null,
            status: "at_risk",
            total: 4,
            done: 1,
            doing: 2,
            overdue: 1,
            unassigned: 1,
            progress: 25,
            members: [{ id: 2, name: "Ada", assigned: 3, done: 1, overdue: 1 }],
          },
        ],
      }}
    />,
  );
  expect(screen.getByRole("link", { name: "Apollo" })).toHaveAttribute("href", "/app/projects/1");
  expect(screen.getByText("At risk")).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "Apollo completion" })).toHaveAttribute(
    "value",
    "25",
  );
  expect(screen.getByText(/25% complete/)).toHaveTextContent("1/4 tasks");
  expect(screen.getByText("Ada").closest("tr")).toHaveTextContent("Ada311");
  expect(screen.getByText("Deadline: Not set")).toBeInTheDocument();
});

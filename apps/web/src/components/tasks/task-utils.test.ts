import { describe, expect, it } from "vitest";

import type { TaskListItem } from "./task-types";
import { projectTaskNumbers, taskOrdinal } from "./task-utils";

function task(id: number, overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id,
    projectId: 7,
    title: `Task ${id}`,
    description: null,
    status: "todo",
    priority: "medium",
    assigneeId: null,
    dueAt: null,
    createdAt: Date.now(),
    assignee: null,
    ...overrides,
  };
}

describe("projectTaskNumbers", () => {
  it("numbers the tasks of a project from 1, in creation order", () => {
    const numbers = projectTaskNumbers([task(10), task(11), task(12)]);

    expect(numbers.get(10)).toBe(1);
    expect(numbers.get(11)).toBe(2);
    expect(numbers.get(12)).toBe(3);
  });

  it("orders by id, not by the position in the given array", () => {
    const numbers = projectTaskNumbers([task(12), task(10), task(11)]);

    expect(numbers.get(10)).toBe(1);
    expect(numbers.get(11)).toBe(2);
    expect(numbers.get(12)).toBe(3);
  });

  it("orders by id, not by the status of the task", () => {
    const numbers = projectTaskNumbers([
      task(10, { status: "done" }),
      task(11, { status: "backlog" }),
      task(12, { status: "doing" }),
    ]);

    expect(numbers.get(10)).toBe(1);
    expect(numbers.get(11)).toBe(2);
    expect(numbers.get(12)).toBe(3);
  });

  it("ignores the gap left by tasks of other projects", () => {
    // Ids 8 and 9 belong to another project: this board still starts at #1.
    const numbers = projectTaskNumbers([task(10), task(11)]);

    expect(numbers.get(10)).toBe(1);
    expect(numbers.get(11)).toBe(2);
    expect(numbers.size).toBe(2);
  });

  it("returns an empty map for a project without tasks", () => {
    expect(projectTaskNumbers([]).size).toBe(0);
  });

  it("does not mutate the list it receives", () => {
    const tasks = [task(12), task(10)];
    projectTaskNumbers(tasks);
    expect(tasks.map((item) => item.id)).toEqual([12, 10]);
  });
});

describe("taskOrdinal", () => {
  it("reads the ordinal of a task out of the map", () => {
    const numbers = projectTaskNumbers([task(10), task(11)]);
    expect(taskOrdinal(numbers, 11)).toBe(2);
  });

  it("returns 0 for a task that is not part of the project", () => {
    const numbers = projectTaskNumbers([task(10)]);
    expect(taskOrdinal(numbers, 999)).toBe(0);
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("./actions", () => ({
  createWikiPage: vi.fn(),
  updateWikiPage: vi.fn(),
  removeWikiPage: vi.fn(),
}));

import { WikiWorkspace } from "./wiki-workspace";
import { removeWikiPage } from "./actions";

const pages = [
  {
    id: 1,
    projectId: 42,
    title: "Overview",
    content: "Read [[References]] and [[Missing]].",
    authorId: 7,
    updatedAt: 1,
  },
  {
    id: 2,
    projectId: 42,
    title: "References",
    content: "Useful links.",
    authorId: 7,
    updatedAt: 2,
  },
];

describe("WikiWorkspace", () => {
  it("keeps an empty page blank and shows the page count in the sidebar", () => {
    const { container } = render(
      <WikiWorkspace
        projectId="42"
        initialPages={[{ ...pages[0]!, title: "Empty", content: "" }]}
        selectedPageId={1}
      />,
    );

    expect(screen.getByText("1 page in this project")).toBeInTheDocument();
    expect(container.querySelector(".wiki-reading .wiki-markdown")?.textContent).toBe("");
    expect(screen.queryByText("Nothing to preview yet.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal links use/)).not.toBeInTheDocument();
  });

  it("renders project-local wiki links and leaves missing destinations unresolved", () => {
    render(<WikiWorkspace projectId="42" initialPages={pages} selectedPageId={1} />);

    expect(
      screen
        .getAllByRole("link", { name: "References" })
        .every((link) => link.getAttribute("href") === "/app/projects/42/wiki?page=2"),
    ).toBe(true);
    expect(screen.getByText("Missing")).toHaveClass("wiki-unresolved-link");
    expect(screen.getByText("Missing").closest("a")).toBeNull();
  });

  it("shows the page selected by a changed URL parameter", async () => {
    const { rerender } = render(
      <WikiWorkspace projectId="42" initialPages={pages} selectedPageId={1} />,
    );

    rerender(<WikiWorkspace projectId="42" initialPages={pages} selectedPageId={2} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "References" })).toBeInTheDocument();
      expect(screen.getByText("Useful links.")).toBeInTheDocument();
    });
  });

  it("opens and closes the Markdown help dialog", () => {
    const { container } = render(
      <WikiWorkspace projectId="42" initialPages={pages} selectedPageId={1} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Markdown help" }));
    expect(screen.getByRole("dialog", { name: "Markdown help" })).toBeInTheDocument();
    expect(screen.getByText("**important text**")).toBeInTheDocument();
    expect(screen.getByText("[[Architecture]]")).toBeInTheDocument();
    expect(container.querySelector(".wiki-help-code-sample code")?.textContent).toBe(
      "```\nconst value = 42;\n```",
    );
    expect(
      screen.getByText("Put the opening and closing triple backticks on separate lines."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close Markdown help" }));
    expect(screen.queryByRole("dialog", { name: "Markdown help" })).not.toBeInTheDocument();
  });

  it("requires confirmation before permanently deleting a page", async () => {
    vi.mocked(removeWikiPage).mockResolvedValue({});
    render(<WikiWorkspace projectId="42" initialPages={pages} selectedPageId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/Delete “Overview”\?/);
    expect(removeWikiPage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(removeWikiPage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
    await waitFor(() => expect(removeWikiPage).toHaveBeenCalledWith("42", 1));
  });
});

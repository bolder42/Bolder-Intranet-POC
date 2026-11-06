import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/shell/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}));

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("renders its children inside the auth shell", () => {
    const { container } = render(
      <AuthLayout>
        <p>Login content</p>
      </AuthLayout>,
    );

    expect(screen.getByText("Login content")).toBeInTheDocument();
    expect(container.querySelector(".auth-shell")).not.toBeNull();
    expect(container.querySelector(".auth-shell-inner")).not.toBeNull();
  });

  it("shows the brand header and theme toggle", () => {
    render(
      <AuthLayout>
        <p>Register content</p>
      </AuthLayout>,
    );

    expect(screen.getByText("Bolder Intranet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
  });
});

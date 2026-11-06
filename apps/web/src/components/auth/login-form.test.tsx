import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
}));

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("renders the email and password inputs and the submit button", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("links to the register page", () => {
    render(<LoginForm />);

    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute(
      "href",
      "/auth/register",
    );
  });

  it("shows a form-level error alert when signIn fails", async () => {
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin" });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password.");
    });
    expect(screen.getByLabelText("Password")).toBeInvalid();
  });
});

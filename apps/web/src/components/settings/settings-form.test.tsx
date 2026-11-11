import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@bolder/shared";

import { SettingsForm } from "./settings-form";
import { updateProfileAction } from "./settings-actions";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("./settings-actions", () => ({
  updateProfileAction: vi.fn(),
}));

const mockedUpdate = vi.mocked(updateProfileAction);

const initial: UserProfile = {
  id: 7,
  email: "ada@bolder.local",
  name: "Ada Lovelace",
  role: "dev",
  image: null,
};

function renderForm(overrides: Partial<UserProfile> = {}) {
  return render(<SettingsForm initial={{ ...initial, ...overrides }} />);
}

beforeEach(() => {
  mockedUpdate.mockReset();
  mockedUpdate.mockResolvedValue({ ...initial, name: "Ada L." });
  push.mockReset();
});

describe("SettingsForm", () => {
  it("renders the current display name and photo state", () => {
    renderForm();

    expect(screen.getByLabelText("Display name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText("Photo URL")).toHaveValue("");
    // No photo yet → monogram fallback, no <img>.
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Profile photo preview" })).toBeNull();
  });

  it("shows a live preview for a valid photo URL", () => {
    renderForm({ image: "https://example.com/ada.png" });

    const preview = screen.getByRole("img", { name: "Profile photo preview" });
    expect(preview).toHaveAttribute("src", "https://example.com/ada.png");
  });

  it("flags a non-http photo link instead of previewing it", () => {
    renderForm({ image: "javascript:alert(1)" });

    expect(screen.queryByRole("img", { name: "Profile photo preview" })).toBeNull();
    expect(screen.getByText(/must start with http/)).toBeInTheDocument();
  });

  it("saves trimmed values and reports success", async () => {
    renderForm();
    mockedUpdate.mockResolvedValue({ ...initial, name: "Ada L.", image: "https://x.co/a.png" });

    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "  Ada L.  " } });
    fireEvent.change(screen.getByLabelText("Photo URL"), {
      target: { value: " https://x.co/a.png " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith({
        name: "Ada L.",
        image: "https://x.co/a.png",
      }),
    );
    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
  });

  it("refuses to submit an empty display name", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/can't be empty/);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("keeps English active and only shows a note when Portuguese is clicked", () => {
    renderForm();

    const english = screen.getByRole("button", { name: "English" });
    const portuguese = screen.getByRole("button", { name: "Português" });
    expect(english).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(portuguese);

    expect(screen.getByRole("status")).toHaveTextContent(/Portuguese is coming soon/);
    // No state change: English remains the pressed language, nothing saved.
    expect(english).toHaveAttribute("aria-pressed", "true");
    expect(portuguese).toHaveAttribute("aria-pressed", "false");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("clears the photo with the remove button", () => {
    renderForm({ image: "https://example.com/ada.png" });

    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));

    expect(screen.getByLabelText("Photo URL")).toHaveValue("");
    expect(screen.queryByRole("img", { name: "Profile photo preview" })).toBeNull();
  });

  it("surfaces a save failure from the server action", async () => {
    renderForm();
    mockedUpdate.mockRejectedValue(new Error("Could not save your settings."));

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save your settings.");
  });

  it("closes the page and returns to the dashboard via the Back button", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(push).toHaveBeenCalledWith("/app");
  });
});

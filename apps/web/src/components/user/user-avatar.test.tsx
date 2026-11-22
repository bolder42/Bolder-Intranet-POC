import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserAvatar } from "./user-avatar";

describe("UserAvatar", () => {
  it("renders the photo for a valid http(s) URL", () => {
    const { container } = render(<UserAvatar name="Ada Lovelace" image="https://x.co/a.png" />);

    const photo = container.querySelector("img.user-avatar");
    expect(photo).toHaveAttribute("src", "https://x.co/a.png");
    // Decorative: the name is rendered as text next to it.
    expect(photo).toHaveAttribute("alt", "");
  });

  it("falls back to the first-letter monogram when there is no photo", () => {
    const { container } = render(<UserAvatar name="ada lovelace" image={null} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".user-avatar-fallback")).toHaveTextContent("A");
  });

  it("rejects non-http image URLs instead of rendering them", () => {
    const { container } = render(<UserAvatar name="Ada" image="javascript:alert(1)" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".user-avatar-fallback")).toHaveTextContent("A");
  });

  it("honours the size prop", () => {
    const { container } = render(<UserAvatar name="Ada" size={32} />);

    const avatar = container.firstElementChild as HTMLElement;
    expect(avatar).toHaveStyle({ width: "32px", height: "32px" });
  });

  it("shows a placeholder glyph for a blank name", () => {
    const { container } = render(<UserAvatar name="   " />);

    expect(container.querySelector(".user-avatar-fallback")).toHaveTextContent("?");
  });
});

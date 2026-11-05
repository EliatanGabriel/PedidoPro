import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "@/components/logo";

describe("Logo", () => {
  it("renders an image with alt text", () => {
    render(<Logo width={32} height={18} />);
    const img = screen.getByRole("img", { name: /logotipo ordexa/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/logo.png");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders children and is a button element", () => {
    render(<Button>Salvar</Button>);
    const button = screen.getByRole("button", { name: /salvar/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveAttribute("type", "button");
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">Excluir</Button>);
    const button = screen.getByRole("button", { name: /excluir/i });
    expect(button).toHaveClass("text-[#9c2b2b]");
  });
});

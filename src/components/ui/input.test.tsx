import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("renders an input with placeholder and value", () => {
    render(<Input name="name" placeholder="Nome" defaultValue="Ana" />);
    const input = screen.getByPlaceholderText("Nome");
    expect(input).toHaveAttribute("placeholder", "Nome");
    expect(input).toHaveValue("Ana");
  });

  it("applies disabled state", () => {
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });
});

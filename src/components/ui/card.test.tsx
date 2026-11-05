import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardTitle, CardContent } from "./card";

describe("Card", () => {
  it("renders title and content", () => {
    render(
      <Card>
        <CardTitle>Meu título</CardTitle>
        <CardContent>Conteúdo aqui</CardContent>
      </Card>
    );
    expect(screen.getByText("Meu título")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo aqui")).toBeInTheDocument();
  });
});

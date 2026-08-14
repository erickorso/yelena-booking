import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/atoms/Button";

describe("Button", () => {
  it("renders an accessible button by role", () => {
    render(<Button>Reservar</Button>);
    expect(screen.getByRole("button", { name: "Reservar" })).toBeInTheDocument();
  });
});

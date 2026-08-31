import { render, screen } from "@testing-library/react";
import Home from "./page";

// Smoke test proving the Vitest + React Testing Library setup works.
describe("Home", () => {
  it("renders the scaffold heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /to get started, edit the/i }),
    ).toBeInTheDocument();
  });
});

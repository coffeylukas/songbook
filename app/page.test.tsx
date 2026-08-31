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

  // TEMPORARY: deliberate failure to prove CI goes red. Reverted immediately.
  it("fails on purpose", () => {
    expect(1).toBe(2);
  });
});

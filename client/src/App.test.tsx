import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App", () => {
  test("renders layout with live crypto analysis page", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    // Check for main sections
    expect(screen.getByText(/Current Price/i)).toBeInTheDocument();
    expect(screen.getByText(/Price History/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Updates/i)).toBeInTheDocument();
  });
});

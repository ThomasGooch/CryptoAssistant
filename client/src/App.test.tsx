import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  test("renders layout with crypto analysis page", () => {
    render(<App />);

    // Check for main sections
    expect(screen.getByText(/Current Price/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical Indicators/i)).toBeInTheDocument();
  });
});

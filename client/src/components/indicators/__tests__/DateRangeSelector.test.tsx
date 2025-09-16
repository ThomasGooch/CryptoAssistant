import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DateRangeSelector from "../DateRangeSelector";
import { DATE_RANGE_PRESETS } from "../dateRangeConstants";

describe("DateRangeSelector", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders all date range preset buttons", () => {
    render(
      <DateRangeSelector
        selectedRange="30d"
        onChange={mockOnChange}
      />
    );

    DATE_RANGE_PRESETS.forEach((preset) => {
      expect(screen.getByText(preset.label)).toBeInTheDocument();
    });
  });

  it("highlights the selected range", () => {
    render(
      <DateRangeSelector
        selectedRange="7d"
        onChange={mockOnChange}
      />
    );

    const sevenDayButton = screen.getByText("7 Days");
    expect(sevenDayButton).toHaveClass("bg-blue-600", "text-white");
    
    const thirtyDayButton = screen.getByText("30 Days");
    expect(thirtyDayButton).toHaveClass("bg-white", "text-gray-700");
  });

  it("calls onChange when a button is clicked", () => {
    render(
      <DateRangeSelector
        selectedRange="30d"
        onChange={mockOnChange}
      />
    );

    const ninetyDayButton = screen.getByText("90 Days");
    fireEvent.click(ninetyDayButton);

    expect(mockOnChange).toHaveBeenCalledWith("90d", 90);
  });

  it("handles max range button correctly", () => {
    render(
      <DateRangeSelector
        selectedRange="30d"
        onChange={mockOnChange}
      />
    );

    const maxRangeButton = screen.getByText("Max Range");
    fireEvent.click(maxRangeButton);

    expect(mockOnChange).toHaveBeenCalledWith("max", 90);
  });

  it("disables all buttons when disabled prop is true", () => {
    render(
      <DateRangeSelector
        selectedRange="30d"
        onChange={mockOnChange}
        disabled={true}
      />
    );

    DATE_RANGE_PRESETS.forEach((preset) => {
      const button = screen.getByText(preset.label);
      expect(button).toBeDisabled();
      expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
    });
  });

  it("does not call onChange when disabled button is clicked", () => {
    render(
      <DateRangeSelector
        selectedRange="30d"
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const sevenDayButton = screen.getByText("7 Days");
    fireEvent.click(sevenDayButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("displays the date range label", () => {
    render(
      <DateRangeSelector
        selectedRange="30d"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("Date Range:")).toBeInTheDocument();
  });
});
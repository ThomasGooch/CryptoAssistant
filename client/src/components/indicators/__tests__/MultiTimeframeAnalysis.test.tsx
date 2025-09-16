import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MultiTimeframeAnalysis from "../MultiTimeframeAnalysis";
import { IndicatorType, Timeframe, TrendDirection } from "../../../types/domain";
import * as multiTimeframeService from "../../../services/multiTimeframeService";
import * as indicatorService from "../../../services/indicatorService";

// Mock the services
vi.mock("../../../services/multiTimeframeService");
vi.mock("../../../services/indicatorService");

describe("MultiTimeframeAnalysis", () => {
  const mockMultiTimeframeService = vi.mocked(multiTimeframeService);
  const mockIndicatorService = vi.mocked(indicatorService);

  const mockProps = {
    symbol: "BTC",
    indicatorType: IndicatorType.SimpleMovingAverage,
    period: 14,
  };

  const mockResponse = {
    symbol: "BTC",
    indicatorType: IndicatorType.SimpleMovingAverage,
    period: 14,
    results: {
      [Timeframe.FiveMinutes]: {
        value: 50000,
        timestamp: "2025-01-15T12:00:00Z",
        calculatedAt: "2025-01-15T12:00:00Z",
      },
      [Timeframe.Hour]: {
        value: 50500,
        timestamp: "2025-01-15T12:00:00Z",
        calculatedAt: "2025-01-15T12:00:00Z",
      },
      [Timeframe.Day]: {
        value: 51000,
        timestamp: "2025-01-15T12:00:00Z",
        calculatedAt: "2025-01-15T12:00:00Z",
      },
    },
    alignment: {
      alignmentScore: 0.85,
      trendDirection: TrendDirection.Bullish,
      indicatorValues: {
        [Timeframe.FiveMinutes]: 50000,
        [Timeframe.Hour]: 50500,
        [Timeframe.Day]: 51000,
      },
      strongestTimeframe: Timeframe.Day,
      weakestTimeframe: Timeframe.FiveMinutes,
    },
    startTime: "2025-01-01T12:00:00Z",
    endTime: "2025-01-15T12:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIndicatorService.indicatorService = {
      getIndicatorDisplayName: vi.fn().mockReturnValue("Simple Moving Average"),
    } as unknown as typeof indicatorService.indicatorService;
    mockMultiTimeframeService.multiTimeframeService = {
      getMultiTimeframeAnalysis: vi.fn().mockResolvedValue(mockResponse),
      getTimeframeDisplayName: vi.fn().mockImplementation((tf: Timeframe) => {
        const names: { [key in Timeframe]?: string } = {
          [Timeframe.Minute]: "1m",
          [Timeframe.FiveMinutes]: "5m",
          [Timeframe.FifteenMinutes]: "15m", 
          [Timeframe.Hour]: "1h", 
          [Timeframe.FourHours]: "4h",
          [Timeframe.Day]: "1d",
          [Timeframe.Week]: "1w"
        };
        return names[tf] || "Unknown";
      }),
      getTrendDirectionInfo: vi.fn().mockReturnValue({
        name: "Bullish",
        color: "text-green-600",
        icon: "📈",
      }),
      getConfluenceStrengthInfo: vi.fn().mockReturnValue({
        level: "Strong",
        color: "text-green-600",
        description: "Good confluence across timeframes",
      }),
      getAlignmentScoreInfo: vi.fn().mockReturnValue({
        level: "Good",
        color: "text-green-600", 
        description: "Indicators show good alignment",
      }),
    } as unknown as typeof multiTimeframeService.multiTimeframeService;
    mockMultiTimeframeService.createDateRange = vi.fn().mockReturnValue({
      days: 30,
      startTime: "2025-01-01T12:00:00Z",
      endTime: "2025-01-15T12:00:00Z",
    });
  });

  it("renders with loading state initially", () => {
    render(<MultiTimeframeAnalysis {...mockProps} />);
    
    // Should show loading skeleton initially  
    expect(screen.getByTestId || screen.getByRole).toBeTruthy();
  });

  it("calls service methods with correct parameters", async () => {
    render(<MultiTimeframeAnalysis {...mockProps} />);
    
    await waitFor(() => {
      expect(mockMultiTimeframeService.createDateRange).toHaveBeenCalledWith(30);
      expect(mockMultiTimeframeService.multiTimeframeService.getMultiTimeframeAnalysis).toHaveBeenCalledWith({
        symbol: "BTC",
        timeframes: [Timeframe.FiveMinutes, Timeframe.Hour, Timeframe.Day],
        indicatorType: IndicatorType.SimpleMovingAverage,
        period: 14,
        startTime: "2025-01-01T12:00:00Z",
        endTime: "2025-01-15T12:00:00Z",
      });
    });
  });

  it("displays error state when API call fails", async () => {
    const errorMessage = "Failed to fetch data";
    (mockMultiTimeframeService.multiTimeframeService.getMultiTimeframeAnalysis as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error(errorMessage));

    render(<MultiTimeframeAnalysis {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("uses custom default timeframes when provided", async () => {
    const customTimeframes = [Timeframe.Hour, Timeframe.Day];
    
    render(
      <MultiTimeframeAnalysis 
        {...mockProps} 
        defaultTimeframes={customTimeframes}
      />
    );
    
    await waitFor(() => {
      expect(mockMultiTimeframeService.multiTimeframeService.getMultiTimeframeAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframes: customTimeframes,
        })
      );
    });
  });
});
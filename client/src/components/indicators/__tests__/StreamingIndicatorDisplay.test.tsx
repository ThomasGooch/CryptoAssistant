import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreamingIndicatorDisplay } from "../StreamingIndicatorDisplay";
import { IndicatorType } from "../../../types/domain";
import type { IndicatorConfig } from "../../../types/domain";
import { indicatorService } from "../../../services/indicatorService";

// Mock the indicator service
vi.mock("../../../services/indicatorService");
const mockedIndicatorService = vi.mocked(indicatorService);

describe("StreamingIndicatorDisplay", () => {
  const mockEnabledIndicators: IndicatorConfig[] = [
    {
      type: IndicatorType.SimpleMovingAverage,
      period: 20,
      color: "#3b82f6",
      enabled: true,
    },
    {
      type: IndicatorType.RelativeStrengthIndex,
      period: 14,
      color: "#8b5cf6",
      enabled: true,
    },
    {
      type: IndicatorType.ExponentialMovingAverage,
      period: 12,
      color: "#10b981",
      enabled: false, // Disabled
    },
  ];

  const mockIndicatorData = {
    "0_20": {
      type: IndicatorType.SimpleMovingAverage,
      period: 20,
      value: 105.5,
      isInitialized: true,
    },
    "2_14": {
      type: IndicatorType.RelativeStrengthIndex,
      period: 14,
      value: 75.25,
      isInitialized: true,
    },
  };

  beforeEach(() => {
    mockedIndicatorService.getIndicatorDisplayName.mockImplementation(
      (type) => {
        switch (type) {
          case IndicatorType.SimpleMovingAverage:
            return "Simple Moving Average (SMA)";
          case IndicatorType.RelativeStrengthIndex:
            return "Relative Strength Index (RSI)";
          case IndicatorType.ExponentialMovingAverage:
            return "Exponential Moving Average (EMA)";
          default:
            return "Unknown Indicator";
        }
      },
    );
  });

  describe("rendering", () => {
    it("should render enabled indicators correctly", () => {
      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={mockIndicatorData}
          enabledIndicators={mockEnabledIndicators}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("Live Technical Indicators")).toBeInTheDocument();
      expect(
        screen.getByText("Simple Moving Average (SMA)"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Relative Strength Index (RSI)"),
      ).toBeInTheDocument();
      expect(screen.getByText("$105.50")).toBeInTheDocument();
      expect(screen.getByText("75.25%")).toBeInTheDocument();
    });

    it("should show streaming indicator when live updating", () => {
      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={mockIndicatorData}
          enabledIndicators={mockEnabledIndicators}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("STREAMING")).toBeInTheDocument();
    });

    it("should not show streaming indicator when not live updating", () => {
      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={mockIndicatorData}
          enabledIndicators={mockEnabledIndicators}
          isInitializing={false}
          error={null}
          isLiveUpdating={false}
        />,
      );

      expect(screen.queryByText("STREAMING")).not.toBeInTheDocument();
    });

    it("should display period and symbol for each indicator", () => {
      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={mockIndicatorData}
          enabledIndicators={mockEnabledIndicators}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("Period: 20")).toBeInTheDocument();
      expect(screen.getByText("Period: 14")).toBeInTheDocument();
      expect(screen.getAllByText("BTC")).toHaveLength(2);
    });
  });

  describe("RSI signal interpretation", () => {
    it("should show overbought signal for RSI >= 70", () => {
      const overboughtData = {
        "2_14": {
          type: IndicatorType.RelativeStrengthIndex,
          period: 14,
          value: 75,
          isInitialized: true,
        },
      };

      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={overboughtData}
          enabledIndicators={[mockEnabledIndicators[1]]}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("Overbought")).toBeInTheDocument();
      expect(screen.getByText("Overbought")).toHaveClass(
        "bg-red-100",
        "text-red-700",
      );
    });

    it("should show oversold signal for RSI <= 30", () => {
      const oversoldData = {
        "2_14": {
          type: IndicatorType.RelativeStrengthIndex,
          period: 14,
          value: 25,
          isInitialized: true,
        },
      };

      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={oversoldData}
          enabledIndicators={[mockEnabledIndicators[1]]}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("Oversold")).toBeInTheDocument();
      expect(screen.getByText("Oversold")).toHaveClass(
        "bg-green-100",
        "text-green-700",
      );
    });

    it("should show neutral signal for RSI between 30-70", () => {
      const neutralData = {
        "2_14": {
          type: IndicatorType.RelativeStrengthIndex,
          period: 14,
          value: 50,
          isInitialized: true,
        },
      };

      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={neutralData}
          enabledIndicators={[mockEnabledIndicators[1]]}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("Neutral")).toBeInTheDocument();
      expect(screen.getByText("Neutral")).toHaveClass(
        "bg-gray-100",
        "text-gray-700",
      );
    });
  });

  describe("loading states", () => {
    it("should show initializing state", () => {
      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={{}}
          enabledIndicators={mockEnabledIndicators}
          isInitializing={true}
          error={null}
          isLiveUpdating={false}
        />,
      );

      expect(
        screen.getByText("Initializing streaming indicators..."),
      ).toBeInTheDocument();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("should show initialization indicator for uninitialized indicators", () => {
      const uninitializedData = {
        "0_20": {
          type: IndicatorType.SimpleMovingAverage,
          period: 20,
          value: null,
          isInitialized: false,
        },
      };

      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={uninitializedData}
          enabledIndicators={[mockEnabledIndicators[0]]}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      // Look for the yellow dot that indicates initializing
      const initializingDot = screen.getByTitle("Initializing...");
      expect(initializingDot).toHaveClass("bg-yellow-500");
    });
  });

  describe("error states", () => {
    it("should display error message", () => {
      const errorMessage = "Failed to initialize indicators";

      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={{}}
          enabledIndicators={mockEnabledIndicators}
          isInitializing={false}
          error={errorMessage}
          isLiveUpdating={false}
        />,
      );

      expect(
        screen.getByText(`Error loading streaming indicators: ${errorMessage}`),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    it("should show message when no indicators are enabled", () => {
      const noEnabledIndicators = mockEnabledIndicators.map((ind) => ({
        ...ind,
        enabled: false,
      }));

      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={{}}
          enabledIndicators={noEnabledIndicators}
          isInitializing={false}
          error={null}
          isLiveUpdating={false}
        />,
      );

      expect(
        screen.getByText("No indicators enabled for streaming calculations"),
      ).toBeInTheDocument();
    });
  });

  describe("status information", () => {
    it("should show correct status for live streaming", () => {
      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={mockIndicatorData}
          enabledIndicators={mockEnabledIndicators}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("Live streaming enabled")).toBeInTheDocument();
      expect(screen.getByText("2 indicators active")).toBeInTheDocument();
    });

    it("should show correct status for historical data only", () => {
      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={mockIndicatorData}
          enabledIndicators={mockEnabledIndicators}
          isInitializing={false}
          error={null}
          isLiveUpdating={false}
        />,
      );

      expect(screen.getByText("Historical data only")).toBeInTheDocument();
    });

    it("should handle singular indicator count", () => {
      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={mockIndicatorData}
          enabledIndicators={[mockEnabledIndicators[0]]}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("1 indicator active")).toBeInTheDocument();
    });
  });

  describe("value formatting", () => {
    it("should format different indicator types correctly", () => {
      const mixedData = {
        "0_20": {
          type: IndicatorType.SimpleMovingAverage,
          period: 20,
          value: 105.5,
          isInitialized: true,
        },
        "2_14": {
          type: IndicatorType.RelativeStrengthIndex,
          period: 14,
          value: 75.25,
          isInitialized: true,
        },
        "5_12": {
          type: IndicatorType.MACD,
          period: 12,
          value: 0.1234,
          isInitialized: true,
        },
      };

      const mixedIndicators = [
        ...mockEnabledIndicators.slice(0, 2),
        {
          type: IndicatorType.MACD,
          period: 12,
          color: "#f59e0b",
          enabled: true,
        },
      ];

      mockedIndicatorService.getIndicatorDisplayName.mockImplementation(
        (type) => {
          if (type === IndicatorType.MACD) return "MACD";
          return type.toString();
        },
      );

      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={mixedData}
          enabledIndicators={mixedIndicators}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("$105.50")).toBeInTheDocument(); // SMA
      expect(screen.getByText("75.25%")).toBeInTheDocument(); // RSI
      expect(screen.getByText("0.1234")).toBeInTheDocument(); // MACD
    });

    it("should show N/A for null values", () => {
      const nullValueData = {
        "0_20": {
          type: IndicatorType.SimpleMovingAverage,
          period: 20,
          value: null,
          isInitialized: false,
        },
      };

      render(
        <StreamingIndicatorDisplay
          symbol="BTC"
          indicators={nullValueData}
          enabledIndicators={[mockEnabledIndicators[0]]}
          isInitializing={false}
          error={null}
          isLiveUpdating={true}
        />,
      );

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });
});

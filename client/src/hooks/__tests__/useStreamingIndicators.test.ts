import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStreamingIndicators } from "../useStreamingIndicators";
import { IndicatorType, Timeframe } from "../../types/domain";
import type { IndicatorConfig, CryptoPrice } from "../../types/domain";
import { streamingIndicatorService } from "../../services/streamingIndicatorService";
import { cryptoService } from "../../services/cryptoService";

// Mock the services
vi.mock("../../services/streamingIndicatorService");
vi.mock("../../services/cryptoService");

const mockedStreamingIndicatorService = vi.mocked(streamingIndicatorService);
const mockedCryptoService = vi.mocked(cryptoService);

describe("useStreamingIndicators", () => {
  const mockIndicators: IndicatorConfig[] = [
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
      enabled: false, // Disabled indicator
    },
  ];

  const mockHistoricalPrices = {
    symbol: "BTC",
    timeframe: Timeframe.Hour,
    prices: [
      { timestamp: new Date("2023-01-01T00:00:00Z"), price: 100 },
      { timestamp: new Date("2023-01-01T01:00:00Z"), price: 101 },
      { timestamp: new Date("2023-01-01T02:00:00Z"), price: 102 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockedCryptoService.getHistoricalPrices.mockResolvedValue(
      mockHistoricalPrices,
    );
    mockedStreamingIndicatorService.initializeIndicator.mockReturnValue(
      "BTC_0_20",
    );
    mockedStreamingIndicatorService.subscribeToIndicator.mockImplementation(
      () => "subscription_key",
    );
    mockedStreamingIndicatorService.getCurrentValue.mockReturnValue(50.5);
    mockedStreamingIndicatorService.updateIndicator.mockReturnValue({
      value: 51.0,
      timestamp: new Date().toISOString(),
    });
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useStreamingIndicators());

      expect(result.current.indicatorData).toEqual({});
      expect(result.current.isInitializing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    it("should not initialize when symbol is empty", () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      expect(result.current.isInitializing).toBe(false);
      expect(mockedCryptoService.getHistoricalPrices).not.toHaveBeenCalled();
    });

    it("should not initialize when indicators are empty", () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: [],
          enableLiveUpdates: true,
        }),
      );

      expect(result.current.isInitializing).toBe(false);
      expect(mockedCryptoService.getHistoricalPrices).not.toHaveBeenCalled();
    });

    it("should not initialize when live updates are disabled", () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: false,
        }),
      );

      expect(result.current.isInitializing).toBe(false);
      expect(mockedCryptoService.getHistoricalPrices).not.toHaveBeenCalled();
    });
  });

  describe("indicator initialization", () => {
    it("should initialize indicators with historical data", async () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          timeframe: Timeframe.Hour,
          enableLiveUpdates: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(mockedCryptoService.getHistoricalPrices).toHaveBeenCalledWith(
        "BTC",
        Timeframe.Hour,
      );

      // Should initialize only enabled indicators
      expect(
        mockedStreamingIndicatorService.initializeIndicator,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockedStreamingIndicatorService.initializeIndicator,
      ).toHaveBeenCalledWith(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
        expect.any(Array),
      );
      expect(
        mockedStreamingIndicatorService.initializeIndicator,
      ).toHaveBeenCalledWith(
        "BTC",
        IndicatorType.RelativeStrengthIndex,
        14,
        expect.any(Array),
      );

      // Should subscribe to updates
      expect(
        mockedStreamingIndicatorService.subscribeToIndicator,
      ).toHaveBeenCalledTimes(2);
    });

    it("should handle initialization error", async () => {
      const error = new Error("Failed to fetch historical data");
      mockedCryptoService.getHistoricalPrices.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.error).toBe("Failed to fetch historical data");
      expect(result.current.isInitialized).toBe(false);
    });

    it("should skip disabled indicators", async () => {
      const disabledIndicators: IndicatorConfig[] = [
        {
          type: IndicatorType.SimpleMovingAverage,
          period: 20,
          color: "#3b82f6",
          enabled: false,
        },
      ];

      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: disabledIndicators,
          enableLiveUpdates: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(
        mockedStreamingIndicatorService.initializeIndicator,
      ).not.toHaveBeenCalled();
    });
  });

  describe("updateWithNewPrice", () => {
    it("should update indicators with new price", async () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const newPrice: CryptoPrice = {
        symbol: "BTC",
        price: 105,
        timestamp: new Date().toISOString(),
      };

      result.current.updateWithNewPrice(newPrice);

      expect(
        mockedStreamingIndicatorService.updateIndicator,
      ).toHaveBeenCalledWith(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
        newPrice,
      );
      expect(
        mockedStreamingIndicatorService.updateIndicator,
      ).toHaveBeenCalledWith(
        "BTC",
        IndicatorType.RelativeStrengthIndex,
        14,
        newPrice,
      );
    });

    it("should not update when live updates disabled", async () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: false,
        }),
      );

      const newPrice: CryptoPrice = {
        symbol: "BTC",
        price: 105,
        timestamp: new Date().toISOString(),
      };

      result.current.updateWithNewPrice(newPrice);

      expect(
        mockedStreamingIndicatorService.updateIndicator,
      ).not.toHaveBeenCalled();
    });
  });

  describe("getIndicatorValue", () => {
    it("should return indicator value from indicator data", async () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const value = result.current.getIndicatorValue(
        IndicatorType.SimpleMovingAverage,
        20,
      );
      expect(value).toBe(50.5);
    });

    it("should return null for non-existent indicator", async () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      const value = result.current.getIndicatorValue(IndicatorType.MACD, 12);
      expect(value).toBeNull();
    });
  });

  describe("getIndicatorDisplayValue", () => {
    it("should format RSI value correctly", async () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const displayValue = result.current.getIndicatorDisplayValue(
        IndicatorType.RelativeStrengthIndex,
        14,
      );
      expect(displayValue).toBe("50.50%");
    });

    it("should format SMA value correctly", async () => {
      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const displayValue = result.current.getIndicatorDisplayValue(
        IndicatorType.SimpleMovingAverage,
        20,
      );
      expect(displayValue).toBe("$50.50");
    });

    it("should return N/A for null values", async () => {
      mockedStreamingIndicatorService.getCurrentValue.mockReturnValue(null);

      const { result } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      const displayValue = result.current.getIndicatorDisplayValue(
        IndicatorType.SimpleMovingAverage,
        20,
      );
      expect(displayValue).toBe("N/A");
    });
  });

  describe("cleanup", () => {
    it("should reset state when symbol changes", async () => {
      const { result, rerender } = renderHook(
        ({ symbol }) =>
          useStreamingIndicators({
            symbol,
            indicators: mockIndicators,
            enableLiveUpdates: true,
          }),
        { initialProps: { symbol: "BTC" } },
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Change symbol
      rerender({ symbol: "ETH" });

      await waitFor(() => {
        expect(
          mockedStreamingIndicatorService.unsubscribeFromIndicator,
        ).toHaveBeenCalled();
      });
    });

    it("should cleanup on unmount", async () => {
      const { result, unmount } = renderHook(() =>
        useStreamingIndicators({
          symbol: "BTC",
          indicators: mockIndicators,
          enableLiveUpdates: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      unmount();

      expect(
        mockedStreamingIndicatorService.unsubscribeFromIndicator,
      ).toHaveBeenCalled();
    });
  });
});

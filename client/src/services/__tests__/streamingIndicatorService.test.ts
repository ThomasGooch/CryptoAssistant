import { describe, it, expect, beforeEach, vi } from "vitest";
import { streamingIndicatorService } from "../streamingIndicatorService";
import { IndicatorType } from "../../types/domain";
import type { CryptoPrice } from "../../types/domain";

describe("StreamingIndicatorService", () => {
  beforeEach(() => {
    streamingIndicatorService.clearAll();
  });

  const createMockPrices = (count: number, basePrice = 100): CryptoPrice[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol: "BTC",
      price: basePrice + i * 0.5,
      timestamp: new Date(Date.now() + i * 60000).toISOString(),
    }));
  };

  describe("initializeIndicator", () => {
    it("should initialize indicator without historical data", () => {
      const key = streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
      );

      expect(key).toBe("BTC_0_20");
      expect(
        streamingIndicatorService.getCurrentValue(
          "BTC",
          IndicatorType.SimpleMovingAverage,
          20,
        ),
      ).toBeNull();
    });

    it("should initialize indicator with historical data", () => {
      const prices = createMockPrices(25, 100);

      const key = streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
        prices,
      );

      expect(key).toBe("BTC_0_20");
      const value = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
      );
      expect(value).toBeGreaterThan(0);
    });

    it("should handle insufficient historical data gracefully", () => {
      const prices = createMockPrices(5, 100);

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
        prices,
      );

      const value = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
      );
      expect(value).toBeNull();
    });
  });

  describe("Simple Moving Average", () => {
    it("should calculate SMA correctly", () => {
      const prices = createMockPrices(20, 100);

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        prices,
      );

      const value = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
      );
      // Last 5 prices from our mock data with basePrice 100 + i * 0.5
      // Should be around 108-109 range based on our data generation
      expect(value).toBeGreaterThan(105);
      expect(value).toBeLessThan(115);
    });

    it("should update SMA with new price data", () => {
      const prices = createMockPrices(20, 100);

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        prices,
      );

      const newPrice: CryptoPrice = {
        symbol: "BTC",
        price: 115,
        timestamp: new Date().toISOString(),
      };

      const result = streamingIndicatorService.updateIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        newPrice,
      );

      expect(result).not.toBeNull();
      expect(result!.value).toBeGreaterThan(105); // Updated average should be reasonable
      expect(result!.value).toBeLessThan(125);
    });
  });

  describe("Exponential Moving Average", () => {
    it("should calculate EMA correctly", () => {
      const prices = createMockPrices(30, 100);

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.ExponentialMovingAverage,
        12,
        prices,
      );

      const value = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.ExponentialMovingAverage,
        12,
      );
      expect(value).toBeGreaterThan(0);
      // EMA should be a reasonable value in our price range
      expect(value).toBeGreaterThan(100);
      expect(value).toBeLessThan(120);
    });

    it("should update EMA progressively", () => {
      const prices = createMockPrices(15, 100);

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.ExponentialMovingAverage,
        12,
        prices,
      );

      const initialValue = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.ExponentialMovingAverage,
        12,
      );

      const newPrice: CryptoPrice = {
        symbol: "BTC",
        price: 120,
        timestamp: new Date().toISOString(),
      };

      streamingIndicatorService.updateIndicator(
        "BTC",
        IndicatorType.ExponentialMovingAverage,
        12,
        newPrice,
      );

      const updatedValue = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.ExponentialMovingAverage,
        12,
      );
      expect(updatedValue).toBeGreaterThan(initialValue!);
    });
  });

  describe("Relative Strength Index", () => {
    it("should calculate RSI correctly with mixed price movements", () => {
      // Create prices with alternating up and down movements
      const prices: CryptoPrice[] = [
        { symbol: "BTC", price: 100, timestamp: "2023-01-01T00:00:00Z" },
        { symbol: "BTC", price: 102, timestamp: "2023-01-01T01:00:00Z" },
        { symbol: "BTC", price: 101, timestamp: "2023-01-01T02:00:00Z" },
        { symbol: "BTC", price: 103, timestamp: "2023-01-01T03:00:00Z" },
        { symbol: "BTC", price: 102, timestamp: "2023-01-01T04:00:00Z" },
        { symbol: "BTC", price: 104, timestamp: "2023-01-01T05:00:00Z" },
        { symbol: "BTC", price: 103, timestamp: "2023-01-01T06:00:00Z" },
        { symbol: "BTC", price: 105, timestamp: "2023-01-01T07:00:00Z" },
        { symbol: "BTC", price: 104, timestamp: "2023-01-01T08:00:00Z" },
        { symbol: "BTC", price: 106, timestamp: "2023-01-01T09:00:00Z" },
        { symbol: "BTC", price: 105, timestamp: "2023-01-01T10:00:00Z" },
        { symbol: "BTC", price: 107, timestamp: "2023-01-01T11:00:00Z" },
        { symbol: "BTC", price: 106, timestamp: "2023-01-01T12:00:00Z" },
        { symbol: "BTC", price: 108, timestamp: "2023-01-01T13:00:00Z" },
        { symbol: "BTC", price: 107, timestamp: "2023-01-01T14:00:00Z" },
      ];

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.RelativeStrengthIndex,
        14,
        prices,
      );

      const rsi = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.RelativeStrengthIndex,
        14,
      );
      expect(rsi).toBeGreaterThan(0);
      expect(rsi).toBeLessThan(100);
      // With mixed movements, RSI should be between 30-70 (reasonable range)
      expect(rsi).toBeGreaterThan(30);
      expect(rsi).toBeLessThan(70);
    });

    it("should handle all gains scenario", () => {
      const prices = createMockPrices(20, 100); // All increasing prices

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.RelativeStrengthIndex,
        14,
        prices,
      );

      const rsi = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.RelativeStrengthIndex,
        14,
      );
      expect(rsi).toBeGreaterThan(50); // Should be above neutral
    });

    it("should update RSI with new price", () => {
      const prices = createMockPrices(20, 100);

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.RelativeStrengthIndex,
        14,
        prices,
      );

      const strongUpPrice: CryptoPrice = {
        symbol: "BTC",
        price: 150, // Strong upward move
        timestamp: new Date().toISOString(),
      };

      const result = streamingIndicatorService.updateIndicator(
        "BTC",
        IndicatorType.RelativeStrengthIndex,
        14,
        strongUpPrice,
      );

      expect(result).not.toBeNull();
      expect(result!.value).toBeGreaterThan(50);
    });
  });

  describe("subscribeToIndicator", () => {
    it("should call callback when indicator value updates", () => {
      const callback = vi.fn();
      const prices = createMockPrices(20, 100);

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        prices,
      );

      streamingIndicatorService.subscribeToIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        callback,
      );

      const newPrice: CryptoPrice = {
        symbol: "BTC",
        price: 115,
        timestamp: new Date().toISOString(),
      };

      streamingIndicatorService.updateIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        newPrice,
      );

      expect(callback).toHaveBeenCalledWith({
        value: expect.any(Number),
        timestamp: newPrice.timestamp,
      });
    });

    it("should unsubscribe from indicator updates", () => {
      const callback = vi.fn();
      const prices = createMockPrices(20, 100);

      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        prices,
      );

      const key = streamingIndicatorService.subscribeToIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        callback,
      );

      streamingIndicatorService.unsubscribeFromIndicator(key);

      const newPrice: CryptoPrice = {
        symbol: "BTC",
        price: 115,
        timestamp: new Date().toISOString(),
      };

      streamingIndicatorService.updateIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        5,
        newPrice,
      );

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("clearAll", () => {
    it("should clear all indicator states and callbacks", () => {
      const callback = vi.fn();
      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
      );

      streamingIndicatorService.subscribeToIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
        callback,
      );

      streamingIndicatorService.clearAll();

      const value = streamingIndicatorService.getCurrentValue(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
      );
      expect(value).toBeNull();

      // Should not throw when updating after clear
      expect(() => {
        streamingIndicatorService.updateIndicator(
          "BTC",
          IndicatorType.SimpleMovingAverage,
          20,
          { symbol: "BTC", price: 100, timestamp: new Date().toISOString() },
        );
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle empty symbol gracefully", () => {
      expect(() => {
        streamingIndicatorService.initializeIndicator(
          "",
          IndicatorType.SimpleMovingAverage,
          20,
        );
      }).not.toThrow();
    });

    it("should handle duplicate initialization", () => {
      streamingIndicatorService.initializeIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
      );

      // Second initialization should not throw
      expect(() => {
        streamingIndicatorService.initializeIndicator(
          "BTC",
          IndicatorType.SimpleMovingAverage,
          20,
        );
      }).not.toThrow();
    });

    it("should handle updating non-existent indicator", () => {
      const result = streamingIndicatorService.updateIndicator(
        "BTC",
        IndicatorType.SimpleMovingAverage,
        20,
        { symbol: "BTC", price: 100, timestamp: new Date().toISOString() },
      );

      expect(result).toBeNull();
    });
  });

  describe("Additional Indicators", () => {
    describe("BollingerBands", () => {
      it("should calculate Bollinger Bands middle line", () => {
        const prices = createMockPrices(25, 100);

        streamingIndicatorService.initializeIndicator(
          "BTC",
          IndicatorType.BollingerBands,
          20,
          prices,
        );

        const value = streamingIndicatorService.getCurrentValue(
          "BTC",
          IndicatorType.BollingerBands,
          20,
        );

        expect(value).not.toBeNull();
        expect(typeof value).toBe("number");
      });
    });

    describe("MACD", () => {
      it("should calculate MACD line", () => {
        const prices = createMockPrices(30, 100);

        streamingIndicatorService.initializeIndicator(
          "BTC",
          IndicatorType.MACD,
          12, // Use 12 as the fast period
          prices,
        );

        const value = streamingIndicatorService.getCurrentValue(
          "BTC",
          IndicatorType.MACD,
          12,
        );

        expect(value).not.toBeNull();
        expect(typeof value).toBe("number");
      });
    });

    describe("StochasticOscillator", () => {
      it("should calculate Stochastic %K", () => {
        const prices = createMockPrices(20, 100);

        streamingIndicatorService.initializeIndicator(
          "BTC",
          IndicatorType.StochasticOscillator,
          14,
          prices,
        );

        const value = streamingIndicatorService.getCurrentValue(
          "BTC",
          IndicatorType.StochasticOscillator,
          14,
        );

        expect(value).not.toBeNull();
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    describe("WilliamsPercentR", () => {
      it("should calculate Williams %R via update", () => {
        const prices = createMockPrices(25, 100);

        const key = streamingIndicatorService.initializeIndicator(
          "BTC",
          IndicatorType.WilliamsPercentR,
          14,
          prices,
        );

        expect(key).toBe("BTC_6_14");

        // Add a new price to trigger calculation
        const newPrice = {
          symbol: "BTC",
          price: 120,
          timestamp: new Date().toISOString(),
        };

        const result = streamingIndicatorService.updateIndicator(
          "BTC",
          IndicatorType.WilliamsPercentR,
          14,
          newPrice,
        );

        expect(result).not.toBeNull();
        expect(typeof result!.value).toBe("number");
        expect(result!.value).toBeGreaterThanOrEqual(-100);
        expect(result!.value).toBeLessThanOrEqual(0);
      });
    });
  });
});

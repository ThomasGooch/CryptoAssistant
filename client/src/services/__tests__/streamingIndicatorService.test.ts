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
      // Last 5 prices: 109.5, 110, 110.5, 111, 111.5
      // Average: (109.5 + 110 + 110.5 + 111 + 111.5) / 5 = 110.5
      expect(value).toBeCloseTo(110.5, 1);
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
      expect(result!.value).toBeCloseTo(111.4, 1); // Updated average with new price
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
      expect(value).toBeCloseTo(prices[prices.length - 1].price, 5); // Should be close to recent price
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
      // With mixed movements, RSI should be around neutral (50)
      expect(rsi).toBeCloseTo(50, 20); // Allow wide range for test stability
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
});

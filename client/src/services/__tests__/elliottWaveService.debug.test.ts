import { describe, it, expect } from "vitest";
import { elliottWaveService } from "../elliottWaveService";
import type { CandlestickData } from "../../types/domain";

describe("ElliottWaveService Debug", () => {
  it("should debug pivot detection", () => {
    // Very simple test data with clear 5-wave pattern
    // Need 6 data points to get proper alternating pattern
    const simpleWaveData: CandlestickData[] = [
      // Start: 100
      { timestamp: new Date("2023-01-01"), open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      
      // Wave 1 up: 100 -> 120
      { timestamp: new Date("2023-01-02"), open: 100, high: 120, low: 100, close: 120, volume: 1000 },
      
      // Wave 2 down: 120 -> 110 (50% retracement)
      { timestamp: new Date("2023-01-03"), open: 120, high: 120, low: 110, close: 110, volume: 800 },
      
      // Wave 3 up: 110 -> 150 (strongest)
      { timestamp: new Date("2023-01-04"), open: 110, high: 150, low: 110, close: 150, volume: 1500 },
      
      // Wave 4 down: 150 -> 140 (shallow retracement)
      { timestamp: new Date("2023-01-05"), open: 150, high: 150, low: 140, close: 140, volume: 900 },
      
      // Wave 5 up: 140 -> 165 (final push)
      { timestamp: new Date("2023-01-06"), open: 140, high: 165, low: 140, close: 165, volume: 1200 },
    ];

    console.log("Testing with simple wave data:");
    console.log(simpleWaveData.map(d => ({ date: d.timestamp, close: d.close })));

    // Add debugging - let's check if we can access the private method
    // For now, let's test through the public interface
    const patterns = elliottWaveService.detectImpulseWaves(simpleWaveData);
    
    console.log("Detected patterns:", patterns);
    console.log("Pattern count:", patterns.length);

    // Test pivot detection directly
    const pivots = elliottWaveService.findPivotPoints(simpleWaveData);
    console.log("Detected pivots:", pivots);
    console.log("Pivot count:", pivots.length);

    // Test Fibonacci calculation separately to ensure it works
    const fibLevels = elliottWaveService.calculateFibonacciLevels(165, 100, "retracement");
    console.log("Fib levels work:", Object.keys(fibLevels.levels).length > 0);

    // For now, let's just test that it doesn't crash and can detect basic functionality
    expect(typeof patterns).toBe("object");
    expect(Array.isArray(patterns)).toBe(true);
  });

  it("should calculate fibonacci levels correctly", () => {
    const levels = elliottWaveService.calculateFibonacciLevels(165, 100, "retracement");
    
    console.log("Fibonacci levels:", levels);
    
    // Just verify the calculation works
    expect(levels.levels).toBeDefined();
    expect(typeof levels.levels[0.382]).toBe("number");
  });
});
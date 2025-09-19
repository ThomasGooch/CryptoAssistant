import { describe, it, expect, beforeEach } from "vitest";
import { elliottWaveService } from "../elliottWaveService";
import type { CandlestickData } from "../../types/domain";

describe("ElliottWaveService", () => {
  // Sample candlestick data for testing - represents a classic 5-wave up pattern
  // Need 6 data points to get proper alternating high-low pivot pattern
  const mockCandlestickData: CandlestickData[] = [
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

  // Sample ABC corrective pattern data
  // Need at least 4 data points for proper ABC pattern with alternating pivots
  const mockABCCorrectionData: CandlestickData[] = [
    // Start high: 165 (after impulse wave completion)
    { timestamp: new Date("2023-01-10"), open: 165, high: 165, low: 165, close: 165, volume: 1000 },
    
    // A wave down: 165 -> 140
    { timestamp: new Date("2023-01-11"), open: 165, high: 167, low: 140, close: 142, volume: 1100 },
    
    // B wave up (counter-trend rally): 142 -> 155
    { timestamp: new Date("2023-01-12"), open: 142, high: 158, low: 140, close: 155, volume: 900 },
    
    // C wave down (final decline): 155 -> 128
    { timestamp: new Date("2023-01-13"), open: 155, high: 157, low: 125, close: 128, volume: 1400 },
  ];

  beforeEach(() => {
    // Reset any service state if needed
  });

  describe("Impulse Wave Detection", () => {
    it("should identify a complete 5-wave impulse pattern", () => {
      const patterns = elliottWaveService.detectImpulseWaves(mockCandlestickData);
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].type).toBe("impulse");
      expect(patterns[0].waves).toHaveLength(5);
      expect(patterns[0].waves[0].label).toBe("1");
      expect(patterns[0].waves[4].label).toBe("5");
    });

    it("should validate wave relationships follow Elliott Wave rules", () => {
      const patterns = elliottWaveService.detectImpulseWaves(mockCandlestickData);
      const pattern = patterns[0];
      
      // Wave 2 should not retrace more than 100% of wave 1
      expect(pattern.waves[1].retracement).toBeLessThan(1.0);
      
      // Wave 3 should be the longest wave (in this test case)
      const wave1Length = Math.abs(pattern.waves[0].end.price - pattern.waves[0].start.price);
      const wave3Length = Math.abs(pattern.waves[2].end.price - pattern.waves[2].start.price);
      const wave5Length = Math.abs(pattern.waves[4].end.price - pattern.waves[4].start.price);
      
      expect(wave3Length).toBeGreaterThan(wave1Length);
      expect(wave3Length).toBeGreaterThan(wave5Length);
      
      // Wave 4 should not overlap with wave 1 (for valid impulse)
      expect(pattern.waves[3].end.price).toBeGreaterThan(pattern.waves[0].end.price);
    });

    it("should calculate Fibonacci relationships between waves", () => {
      const patterns = elliottWaveService.detectImpulseWaves(mockCandlestickData);
      const pattern = patterns[0];
      
      // Check if wave 3 has typical Fibonacci extension relative to wave 1
      expect(pattern.fibonacciRelationships).toBeDefined();
      expect(pattern.fibonacciRelationships?.wave3ToWave1Ratio).toBeGreaterThan(1.0);
      
      // In our test data: Wave 1 = 20 (100->120), Wave 3 = 40 (110->150)
      // So ratio is 40/20 = 2.0, which is a valid Elliott Wave relationship
      const expectedRatio = 2.0;
      const tolerance = 0.1;
      expect(pattern.fibonacciRelationships?.wave3ToWave1Ratio)
        .toBeCloseTo(expectedRatio, tolerance);
    });

    it("should not detect incomplete wave patterns", () => {
      // Only provide 3 waves worth of data
      const incompleteData = mockCandlestickData.slice(0, 4);
      const patterns = elliottWaveService.detectImpulseWaves(incompleteData);
      
      expect(patterns).toHaveLength(0);
    });
  });

  describe("Corrective Wave Detection", () => {
    it("should identify ABC corrective patterns", () => {
      const patterns = elliottWaveService.detectCorrectiveWaves(mockABCCorrectionData);
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].type).toBe("abc_correction");
      expect(patterns[0].waves).toHaveLength(3);
      expect(patterns[0].waves[0].label).toBe("A");
      expect(patterns[0].waves[1].label).toBe("B");
      expect(patterns[0].waves[2].label).toBe("C");
    });

    it("should validate ABC wave relationships", () => {
      const patterns = elliottWaveService.detectCorrectiveWaves(mockABCCorrectionData);
      const pattern = patterns[0];
      
      // Wave B should retrace less than 100% of wave A (typical ABC)
      expect(pattern.waves[1].retracement).toBeLessThan(1.0);
      expect(pattern.waves[1].retracement).toBeGreaterThan(0.3); // At least 30% retracement
      
      // Wave C should extend beyond wave A low in a down trend
      expect(pattern.waves[2].end.price).toBeLessThan(pattern.waves[0].end.price);
    });

    it("should calculate Fibonacci retracements for corrections", () => {
      const patterns = elliottWaveService.detectCorrectiveWaves(mockABCCorrectionData);
      const pattern = patterns[0];
      
      expect(pattern.fibonacciLevels).toBeDefined();
      expect(pattern.fibonacciLevels.retracements).toContain(0.382);
      expect(pattern.fibonacciLevels.retracements).toContain(0.618);
    });
  });

  describe("Wave Labeling and Confidence", () => {
    it("should assign confidence scores to detected patterns", () => {
      const patterns = elliottWaveService.detectImpulseWaves(mockCandlestickData);
      
      expect(patterns[0].confidence).toBeGreaterThan(0);
      expect(patterns[0].confidence).toBeLessThanOrEqual(1);
    });

    it("should provide reasons for pattern identification", () => {
      const patterns = elliottWaveService.detectImpulseWaves(mockCandlestickData);
      
      expect(patterns[0].validationRules).toBeDefined();
      expect(patterns[0].validationRules.wave2NoOverlap).toBe(true);
      expect(patterns[0].validationRules.wave4NoOverlapWithWave1).toBe(true);
      expect(patterns[0].validationRules.wave3IsNotShortest).toBe(true);
    });
  });

  describe("Fibonacci Level Calculation", () => {
    it("should calculate standard Fibonacci retracement levels", () => {
      const high = 165;
      const low = 100;
      const levels = elliottWaveService.calculateFibonacciLevels(high, low, "retracement");
      
      // Fix expected values based on correct calculation
      // 165 - (165-100) * 0.382 = 165 - 24.83 = 140.17
      expect(levels.levels[0.382]).toBeCloseTo(140.17, 2);
      expect(levels.levels[0.618]).toBeCloseTo(124.83, 2); 
      expect(levels.levels[0.5]).toBeCloseTo(132.5, 2);
    });

    it("should calculate Fibonacci extension levels", () => {
      const wave1Start = 100;
      const wave1End = 122;
      const wave2End = 110;
      
      const levels = elliottWaveService.calculateFibonacciExtensions(
        wave1Start, wave1End, wave2End
      );
      
      expect(levels.levels[1.618]).toBeCloseTo(145.6, 1); // 110 + (122-100) * 1.618
      expect(levels.levels[2.618]).toBeCloseTo(167.6, 1);
    });
  });

  describe("Pattern Validation", () => {
    it("should validate minimum wave requirements", () => {
      const invalidData: CandlestickData[] = [
        { timestamp: new Date(), open: 100, high: 101, low: 99, close: 100.5, volume: 100 }
      ];
      
      const patterns = elliottWaveService.detectImpulseWaves(invalidData);
      expect(patterns).toHaveLength(0);
    });

    it("should handle edge cases and malformed data", () => {
      const edgeCaseData: CandlestickData[] = [];
      
      expect(() => {
        elliottWaveService.detectImpulseWaves(edgeCaseData);
      }).not.toThrow();
    });
  });
});
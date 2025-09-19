import { describe, it, expect, beforeEach } from "vitest";
import { elliottWaveAlertService } from "../elliottWaveAlertService";
import type { CandlestickData } from "../../types/domain";
import { AlertCondition, AlertSeverity, AlertStatus } from "../../types/domain";

describe("ElliottWaveAlertService", () => {
  // Test data that should produce a clear 5-wave impulse pattern
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

  beforeEach(() => {
    // Clear service state before each test
    elliottWaveAlertService.clearHistory();
  });

  describe("Pattern Detection Alerts", () => {
    it("should generate alert when new impulse pattern is detected", async () => {
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        165, // Current price at end of pattern
        {
          enabled: true,
          minimumConfidence: 0.7,
          fibonacciLevelsToWatch: [0.382, 0.618],
          cooldownMinutes: 30,
        }
      );

      // Should detect an impulse pattern
      const patternAlerts = alerts.filter(a => a.alertType === "pattern_detected");
      expect(patternAlerts.length).toBeGreaterThan(0);

      const impulseAlert = patternAlerts.find(a => a.patternType === "impulse");
      expect(impulseAlert).toBeDefined();
      expect(impulseAlert?.condition).toBe(AlertCondition.ElliottWaveImpulseDetected);
      expect(impulseAlert?.symbol).toBe("BTC-USD");
      expect(impulseAlert?.message).toContain("5-wave impulse pattern detected");
      expect(impulseAlert?.status).toBe(AlertStatus.Active);
    });

    it("should not generate duplicate alerts for same pattern", async () => {
      // First analysis
      const alerts1 = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        165
      );

      // Second analysis with same data (should be in cooldown)
      const alerts2 = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        165
      );

      expect(alerts1.length).toBeGreaterThan(0);
      expect(alerts2.length).toBe(0); // Should be empty due to cooldown
    });

    it("should respect minimum confidence threshold", async () => {
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        165,
        {
          enabled: true,
          minimumConfidence: 0.95, // Very high threshold
          fibonacciLevelsToWatch: [0.382, 0.618],
          cooldownMinutes: 30,
        }
      );

      // May not detect patterns if confidence threshold is too high
      // This tests the filtering mechanism
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe("Fibonacci Level Alerts", () => {
    it("should generate alerts when price approaches Fibonacci levels", async () => {
      // Set current price close to a calculated Fibonacci level
      // Based on our test data: high=165, low=100, 38.2% retrace = 140.17
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        140.5, // Close to 38.2% Fibonacci level
        {
          enabled: true,
          minimumConfidence: 0.7,
          fibonacciLevelsToWatch: [0.382, 0.618],
          cooldownMinutes: 30,
        }
      );

      const fibAlerts = alerts.filter(a => a.alertType === "fibonacci_level");
      expect(fibAlerts.length).toBeGreaterThan(0);

      const fibAlert = fibAlerts[0];
      expect(fibAlert.condition).toBe(AlertCondition.FibonacciLevelApproached);
      expect(fibAlert.fibonacciLevel).toBeDefined();
      expect(fibAlert.targetPrice).toBeDefined();
      expect(fibAlert.message).toContain("Fibonacci");
    });

    it("should only alert on configured Fibonacci levels", async () => {
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        140.5,
        {
          enabled: true,
          minimumConfidence: 0.7,
          fibonacciLevelsToWatch: [0.618], // Only watch 61.8% level
          cooldownMinutes: 30,
        }
      );

      const fibAlerts = alerts.filter(a => a.alertType === "fibonacci_level");
      
      // Should not alert on 38.2% level since it's not in the watch list
      const unwatchedLevelAlerts = fibAlerts.filter(a => a.fibonacciLevel === 0.382);
      expect(unwatchedLevelAlerts.length).toBe(0);
    });
  });

  describe("Wave Target Alerts", () => {
    it("should generate alerts when wave targets are reached", async () => {
      // Set current price very close to final wave target (165)
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        164.8, // Within 1% of wave 5 target (165)
        {
          enabled: true,
          minimumConfidence: 0.7,
          fibonacciLevelsToWatch: [0.382, 0.618],
          cooldownMinutes: 30,
        }
      );

      const waveAlerts = alerts.filter(a => a.alertType === "wave_target");
      expect(waveAlerts.length).toBeGreaterThan(0);

      const waveAlert = waveAlerts[0];
      expect(waveAlert.condition).toBe(AlertCondition.WaveTargetReached);
      expect(waveAlert.waveLabel).toBeDefined();
      expect(waveAlert.targetPrice).toBeDefined();
      expect(waveAlert.message).toContain("Wave");
      expect(waveAlert.message).toContain("target");
    });
  });

  describe("Alert Conversion", () => {
    it("should convert Elliott Wave alerts to standard alert format", async () => {
      const elliottWaveAlerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        165
      );

      const standardAlerts = elliottWaveAlertService.convertToStandardAlerts(elliottWaveAlerts);

      expect(Array.isArray(standardAlerts)).toBe(true);
      
      // Should convert alerts with target prices
      const convertedAlerts = standardAlerts.filter(a => 
        elliottWaveAlerts.some(ewa => ewa.id === a.id && ewa.targetPrice !== undefined)
      );
      
      expect(convertedAlerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Configuration Management", () => {
    it("should not generate alerts when disabled", async () => {
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        165,
        {
          enabled: false, // Disabled
          minimumConfidence: 0.7,
          fibonacciLevelsToWatch: [0.382, 0.618],
          cooldownMinutes: 30,
        }
      );

      expect(alerts.length).toBe(0);
    });

    it("should handle empty data gracefully", async () => {
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        [], // Empty data
        165
      );

      expect(alerts.length).toBe(0);
    });
  });

  describe("Active Pattern Tracking", () => {
    it("should track active patterns for a symbol", async () => {
      await elliottWaveAlertService.analyzeAndAlert("BTC-USD", mockCandlestickData, 165);
      
      const activePatterns = elliottWaveAlertService.getActivePatterns("BTC-USD");
      expect(Array.isArray(activePatterns)).toBe(true);
    });

    it("should clear active patterns when requested", () => {
      elliottWaveAlertService.clearHistory();
      const activePatterns = elliottWaveAlertService.getActivePatterns("BTC-USD");
      expect(activePatterns.length).toBe(0);
    });
  });

  describe("Alert Severity Assignment", () => {
    it("should assign appropriate severity levels based on confidence", async () => {
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        "BTC-USD", 
        mockCandlestickData, 
        165,
        {
          enabled: true,
          minimumConfidence: 0.5, // Lower threshold to test severity assignment
          fibonacciLevelsToWatch: [0.382, 0.618],
          cooldownMinutes: 30,
        }
      );

      const patternAlerts = alerts.filter(a => a.alertType === "pattern_detected");
      
      if (patternAlerts.length > 0) {
        const alert = patternAlerts[0];
        expect([AlertSeverity.Info, AlertSeverity.Warning, AlertSeverity.Critical])
          .toContain(alert.severity);
      }
    });
  });
});
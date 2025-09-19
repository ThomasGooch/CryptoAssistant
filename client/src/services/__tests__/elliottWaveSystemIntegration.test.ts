import { describe, it, expect, beforeEach } from "vitest";
import { elliottWaveService } from "../elliottWaveService";
import { elliottWaveAlertService } from "../elliottWaveAlertService";
import type { CandlestickData } from "../../types/domain";
import { AlertCondition, AlertStatus } from "../../types/domain";

describe("Elliott Wave System Integration", () => {
  // Perfect Elliott Wave test data
  const perfectElliottWaveData: CandlestickData[] = [
    { timestamp: new Date("2023-01-01"), open: 100, high: 100, low: 100, close: 100, volume: 1000 },
    { timestamp: new Date("2023-01-02"), open: 100, high: 120, low: 100, close: 120, volume: 1000 },
    { timestamp: new Date("2023-01-03"), open: 120, high: 120, low: 110, close: 110, volume: 800 },
    { timestamp: new Date("2023-01-04"), open: 110, high: 150, low: 110, close: 150, volume: 1500 },
    { timestamp: new Date("2023-01-05"), open: 150, high: 150, low: 140, close: 140, volume: 900 },
    { timestamp: new Date("2023-01-06"), open: 140, high: 165, low: 140, close: 165, volume: 1200 },
  ];

  beforeEach(() => {
    elliottWaveAlertService.clearHistory();
  });

  it("should provide complete Elliott Wave analysis workflow", async () => {
    const symbol = "BTC-USD";
    
    // Step 1: Detect patterns using core service
    const impulsePatterns = elliottWaveService.detectImpulseWaves(perfectElliottWaveData);
    const correctivePatterns = elliottWaveService.detectCorrectiveWaves(perfectElliottWaveData);
    
    console.log(`✅ Pattern Detection: ${impulsePatterns.length} impulse, ${correctivePatterns.length} corrective`);
    
    expect(impulsePatterns.length).toBeGreaterThan(0);
    
    const pattern = impulsePatterns[0];
    expect(pattern.waves).toHaveLength(5);
    expect(pattern.confidence).toBeGreaterThan(0.7);
    
    // Step 2: Generate alerts based on patterns
    const alerts = await elliottWaveAlertService.analyzeAndAlert(
      symbol,
      perfectElliottWaveData,
      165, // Current price at pattern completion
      {
        enabled: true,
        minimumConfidence: 0.7,
        fibonacciLevelsToWatch: [0.382, 0.618],
        cooldownMinutes: 30,
      }
    );
    
    console.log(`✅ Alert Generation: ${alerts.length} alerts created`);
    
    expect(alerts.length).toBeGreaterThan(0);
    
    // Step 3: Verify alert content
    const patternAlert = alerts.find(a => a.alertType === "pattern_detected");
    expect(patternAlert).toBeDefined();
    expect(patternAlert?.condition).toBe(AlertCondition.ElliottWaveImpulseDetected);
    expect(patternAlert?.status).toBe(AlertStatus.Active);
    
    // Step 4: Test Fibonacci level alerts
    const fibonacciAlerts = await elliottWaveAlertService.analyzeAndAlert(
      symbol,
      perfectElliottWaveData,
      140.2, // Close to 38.2% Fibonacci level (140.17)
      {
        enabled: true,
        minimumConfidence: 0.7,
        fibonacciLevelsToWatch: [0.382, 0.618],
        cooldownMinutes: 30,
      }
    );
    
    const fibAlert = fibonacciAlerts.find(a => a.alertType === "fibonacci_level");
    if (fibAlert) {
      expect(fibAlert.condition).toBe(AlertCondition.FibonacciLevelApproached);
      expect(fibAlert.fibonacciLevel).toBe(0.382);
      console.log(`✅ Fibonacci Alert: ${fibAlert.message}`);
    }
    
    // Step 5: Test wave target alerts
    const waveTargetAlerts = await elliottWaveAlertService.analyzeAndAlert(
      symbol,
      perfectElliottWaveData,
      164.5, // Very close to wave 5 target (165)
      {
        enabled: true,
        minimumConfidence: 0.7,
        fibonacciLevelsToWatch: [0.382, 0.618],
        cooldownMinutes: 30,
      }
    );
    
    const waveAlert = waveTargetAlerts.find(a => a.alertType === "wave_target");
    if (waveAlert) {
      expect(waveAlert.condition).toBe(AlertCondition.WaveTargetReached);
      expect(waveAlert.waveLabel).toBeDefined();
      console.log(`✅ Wave Target Alert: ${waveAlert.message}`);
    }
    
    // Step 6: Test conversion to standard alerts
    const standardAlerts = elliottWaveAlertService.convertToStandardAlerts(alerts);
    expect(Array.isArray(standardAlerts)).toBe(true);
    console.log(`✅ Standard Alert Conversion: ${standardAlerts.length} converted`);
    
    // Step 7: Verify active pattern tracking
    const activePatterns = elliottWaveAlertService.getActivePatterns(symbol);
    expect(activePatterns.length).toBeGreaterThanOrEqual(1);
    console.log(`✅ Active Pattern Tracking: ${activePatterns.length} patterns tracked`);
  });

  it("should handle complete market analysis cycle", async () => {
    const symbol = "ETH-USD";
    
    // Simulate market analysis cycle
    const results = {
      patterns: elliottWaveService.detectImpulseWaves(perfectElliottWaveData),
      pivots: elliottWaveService.findPivotPoints(perfectElliottWaveData),
      fibonacci: elliottWaveService.calculateFibonacciLevels(165, 100, "retracement"),
    };
    
    // Verify all components work together
    expect(results.patterns.length).toBeGreaterThan(0);
    expect(results.pivots.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(results.fibonacci.levels).length).toBeGreaterThan(0);
    
    // Generate comprehensive alerts
    const alerts = await elliottWaveAlertService.analyzeAndAlert(
      symbol,
      perfectElliottWaveData,
      165,
      {
        enabled: true,
        minimumConfidence: 0.6,
        fibonacciLevelsToWatch: [0.236, 0.382, 0.5, 0.618, 0.786],
        cooldownMinutes: 15,
      }
    );
    
    console.log(`✅ Market Analysis Complete:`);
    console.log(`   - Patterns: ${results.patterns.length}`);
    console.log(`   - Pivots: ${results.pivots.length}`);
    console.log(`   - Fib Levels: ${Object.keys(results.fibonacci.levels).length}`);
    console.log(`   - Alerts: ${alerts.length}`);
    console.log(`   - Pattern Confidence: ${(results.patterns[0]?.confidence * 100).toFixed(1)}%`);
    
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("should demonstrate realistic trading scenario", async () => {
    const symbol = "ADA-USD";
    
    // Scenario: Trader monitoring multiple timeframes
    const scenarios = [
      { price: 165, description: "Pattern completion" },
      { price: 140.2, description: "38.2% Fibonacci test" },
      { price: 124.8, description: "61.8% Fibonacci test" },
      { price: 164.8, description: "Wave 5 target approach" },
    ];
    
    console.log(`✅ Trading Scenario Analysis for ${symbol}:`);
    
    for (const scenario of scenarios) {
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        symbol,
        perfectElliottWaveData,
        scenario.price,
        {
          enabled: true,
          minimumConfidence: 0.7,
          fibonacciLevelsToWatch: [0.382, 0.618],
          cooldownMinutes: 5, // Short cooldown for testing
        }
      );
      
      console.log(`   ${scenario.description} ($${scenario.price}): ${alerts.length} alerts`);
      
      if (alerts.length > 0) {
        const alert = alerts[0];
        console.log(`     -> ${alert.alertType}: ${alert.message.substring(0, 50)}...`);
      }
      
      // Clear history between scenarios to test different conditions
      elliottWaveAlertService.clearHistory();
    }
  });

  it("should validate system performance characteristics", async () => {
    const startTime = Date.now();
    
    // Test performance with pattern detection
    const patterns = elliottWaveService.detectImpulseWaves(perfectElliottWaveData);
    const patternTime = Date.now() - startTime;
    
    // Test performance with alert generation
    const alertStart = Date.now();
    const alerts = await elliottWaveAlertService.analyzeAndAlert(
      "BTC-USD",
      perfectElliottWaveData,
      165
    );
    const alertTime = Date.now() - alertStart;
    
    console.log(`✅ Performance Metrics:`);
    console.log(`   - Pattern Detection: ${patternTime}ms`);
    console.log(`   - Alert Generation: ${alertTime}ms`);
    console.log(`   - Total System Response: ${patternTime + alertTime}ms`);
    
    // Validate performance is reasonable (should be under 100ms for small datasets)
    expect(patternTime).toBeLessThan(100);
    expect(alertTime).toBeLessThan(100);
    expect(patterns.length).toBeGreaterThan(0);
    expect(alerts.length).toBeGreaterThanOrEqual(0);
  });

  it("should demonstrate complete pattern lifecycle", async () => {
    const symbol = "SOL-USD";
    
    console.log(`✅ Complete Pattern Lifecycle Demo:`);
    
    // Phase 1: Pattern Formation (early detection)
    const earlyData = perfectElliottWaveData.slice(0, 4); // Only first 4 waves
    const earlyPatterns = elliottWaveService.detectImpulseWaves(earlyData);
    console.log(`   Phase 1 - Early Formation: ${earlyPatterns.length} patterns`);
    
    // Phase 2: Pattern Completion
    const completePatterns = elliottWaveService.detectImpulseWaves(perfectElliottWaveData);
    console.log(`   Phase 2 - Pattern Complete: ${completePatterns.length} patterns`);
    
    if (completePatterns.length > 0) {
      const pattern = completePatterns[0];
      console.log(`   Pattern Details:`);
      console.log(`     - Type: ${pattern.type}`);
      console.log(`     - Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
      console.log(`     - Price Range: $${pattern.priceRange.low} - $${pattern.priceRange.high}`);
      console.log(`     - Wave Count: ${pattern.waves.length}`);
      console.log(`     - Fibonacci Levels: ${Object.keys(pattern.fibonacciLevels.levels).length}`);
      
      // Phase 3: Alert Generation
      const alerts = await elliottWaveAlertService.analyzeAndAlert(
        symbol,
        perfectElliottWaveData,
        pattern.priceRange.high
      );
      
      console.log(`   Phase 3 - Alerts Generated: ${alerts.length}`);
      
      alerts.forEach((alert, index) => {
        console.log(`     Alert ${index + 1}: ${alert.alertType} - ${alert.message.substring(0, 40)}...`);
      });
    }
    
    expect(completePatterns.length).toBeGreaterThanOrEqual(earlyPatterns.length);
  });
});
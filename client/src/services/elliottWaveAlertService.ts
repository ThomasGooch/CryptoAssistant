import { elliottWaveService } from './elliottWaveService';
import { 
  AlertCondition, 
  AlertSeverity, 
  AlertStatus,
} from '../types/domain';
import type { 
  CandlestickData, 
  ElliottWavePattern, 
  ElliottWaveAlert, 
  PriceAlert,
  IndicatorAlert 
} from '../types/domain';

export class ElliottWaveAlertService {
  private activePatterns = new Map<string, ElliottWavePattern>();
  private alertHistory = new Map<string, Date>(); // For cooldown management
  
  // Default configuration
  private defaultConfig = {
    enabled: true,
    minimumConfidence: 0.7,
    fibonacciLevelsToWatch: [0.382, 0.5, 0.618, 0.786],
    cooldownMinutes: 30,
  };

  /**
   * Analyze new market data and trigger alerts for Elliott Wave patterns
   */
  public async analyzeAndAlert(
    symbol: string, 
    data: CandlestickData[], 
    currentPrice: number,
    config = this.defaultConfig
  ): Promise<ElliottWaveAlert[]> {
    if (!config.enabled || data.length === 0) {
      return [];
    }

    const alerts: ElliottWaveAlert[] = [];

    try {
      // Detect patterns
      const impulsePatterns = elliottWaveService.detectImpulseWaves(data);
      const correctivePatterns = elliottWaveService.detectCorrectiveWaves(data);
      const allPatterns = [...impulsePatterns, ...correctivePatterns];

      // Check for new pattern detection alerts
      alerts.push(...this.checkPatternDetectionAlerts(symbol, allPatterns, config));

      // Check for Fibonacci level approach alerts
      alerts.push(...this.checkFibonacciLevelAlerts(symbol, allPatterns, currentPrice, config));

      // Check for wave target reached alerts
      alerts.push(...this.checkWaveTargetAlerts(symbol, allPatterns, currentPrice, config));

      // Update active patterns tracking
      this.updateActivePatterns(symbol, allPatterns);

    } catch (error) {
      console.error('Elliott Wave alert analysis failed:', error);
    }

    return alerts;
  }

  /**
   * Check for new pattern detection alerts
   */
  private checkPatternDetectionAlerts(
    symbol: string, 
    patterns: ElliottWavePattern[], 
    config: typeof this.defaultConfig
  ): ElliottWaveAlert[] {
    const alerts: ElliottWaveAlert[] = [];

    for (const pattern of patterns) {
      // Skip if confidence is too low
      if (pattern.confidence < config.minimumConfidence) {
        continue;
      }

      // Skip if this pattern was already alerted on (cooldown check)
      const alertKey = `${symbol}-${pattern.id}`;
      if (this.isInCooldown(alertKey, config.cooldownMinutes)) {
        continue;
      }

      // Check if this is a new pattern we haven't seen before
      const existingPattern = this.activePatterns.get(`${symbol}-${pattern.type}`);
      const isNewPattern = !existingPattern || existingPattern.id !== pattern.id;

      if (isNewPattern) {
        const alert: ElliottWaveAlert = {
          id: `elliott-${symbol}-${pattern.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          alertType: "pattern_detected",
          condition: pattern.type === "impulse" 
            ? AlertCondition.ElliottWaveImpulseDetected 
            : AlertCondition.ElliottWaveCorrectiveDetected,
          patternType: pattern.type === "impulse" ? "impulse" : "abc_correction",
          minimumConfidence: config.minimumConfidence,
          message: this.generatePatternDetectionMessage(pattern),
          severity: this.getPatternSeverity(pattern),
          status: AlertStatus.Active,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          cooldownSeconds: config.cooldownMinutes * 60,
          patternId: pattern.id,
        };

        alerts.push(alert);
        this.updateAlertHistory(alertKey);
      }
    }

    return alerts;
  }

  /**
   * Check for Fibonacci level approach alerts
   */
  private checkFibonacciLevelAlerts(
    symbol: string, 
    patterns: ElliottWavePattern[], 
    currentPrice: number, 
    config: typeof this.defaultConfig
  ): ElliottWaveAlert[] {
    const alerts: ElliottWaveAlert[] = [];

    for (const pattern of patterns) {
      if (pattern.confidence < config.minimumConfidence) {
        continue;
      }

      const fibLevels = pattern.fibonacciLevels.levels;
      
      for (const [ratioStr, levelPrice] of Object.entries(fibLevels)) {
        const ratio = parseFloat(ratioStr);
        
        // Only alert on configured levels
        if (!config.fibonacciLevelsToWatch.includes(ratio)) {
          continue;
        }

        // Check if price is approaching this level (within 2%)
        const priceDistance = Math.abs(currentPrice - levelPrice);
        const percentDistance = (priceDistance / levelPrice) * 100;
        
        if (percentDistance <= 2.0) { // Within 2% of Fibonacci level
          const alertKey = `${symbol}-fib-${ratio}-${Math.floor(levelPrice)}`;
          
          if (!this.isInCooldown(alertKey, config.cooldownMinutes)) {
            const alert: ElliottWaveAlert = {
              id: `elliott-fib-${symbol}-${ratio}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              symbol,
              alertType: "fibonacci_level",
              condition: AlertCondition.FibonacciLevelApproached,
              fibonacciLevel: ratio,
              targetPrice: levelPrice,
              minimumConfidence: config.minimumConfidence,
              message: `${symbol} approaching Fibonacci ${(ratio * 100).toFixed(1)}% level at $${levelPrice.toFixed(2)} (current: $${currentPrice.toFixed(2)})`,
              severity: AlertSeverity.Info,
              status: AlertStatus.Active,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
              cooldownSeconds: config.cooldownMinutes * 60,
              patternId: pattern.id,
            };

            alerts.push(alert);
            this.updateAlertHistory(alertKey);
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Check for wave target reached alerts
   */
  private checkWaveTargetAlerts(
    symbol: string, 
    patterns: ElliottWavePattern[], 
    currentPrice: number, 
    config: typeof this.defaultConfig
  ): ElliottWaveAlert[] {
    const alerts: ElliottWaveAlert[] = [];

    for (const pattern of patterns) {
      if (pattern.confidence < config.minimumConfidence) {
        continue;
      }

      // Check if price has reached significant wave targets
      const lastWave = pattern.waves[pattern.waves.length - 1];
      const priceDistance = Math.abs(currentPrice - lastWave.end.price);
      const percentDistance = (priceDistance / lastWave.end.price) * 100;

      // Alert if price is very close to the final wave target (within 1%)
      if (percentDistance <= 1.0) {
        const alertKey = `${symbol}-wave-${lastWave.label}-${Math.floor(lastWave.end.price)}`;
        
        if (!this.isInCooldown(alertKey, config.cooldownMinutes)) {
          const alert: ElliottWaveAlert = {
            id: `elliott-wave-${symbol}-${lastWave.label}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            symbol,
            alertType: "wave_target",
            condition: AlertCondition.WaveTargetReached,
            waveLabel: lastWave.label,
            targetPrice: lastWave.end.price,
            minimumConfidence: config.minimumConfidence,
            message: `${symbol} reached Wave ${lastWave.label} target at $${lastWave.end.price.toFixed(2)} (${pattern.type} pattern)`,
            severity: AlertSeverity.Warning,
            status: AlertStatus.Active,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
            cooldownSeconds: config.cooldownMinutes * 60,
            patternId: pattern.id,
          };

          alerts.push(alert);
          this.updateAlertHistory(alertKey);
        }
      }
    }

    return alerts;
  }

  /**
   * Convert Elliott Wave alerts to standard price/indicator alerts for existing alert system
   */
  public convertToStandardAlerts(elliottWaveAlerts: ElliottWaveAlert[]): (PriceAlert | IndicatorAlert)[] {
    const standardAlerts: (PriceAlert | IndicatorAlert)[] = [];

    for (const ewAlert of elliottWaveAlerts) {
      if (ewAlert.targetPrice) {
        // Convert to price alert
        const priceAlert: PriceAlert = {
          id: ewAlert.id,
          symbol: ewAlert.symbol,
          condition: ewAlert.targetPrice > 0 ? AlertCondition.PriceAbove : AlertCondition.PriceBelow,
          targetValue: ewAlert.targetPrice,
          message: ewAlert.message,
          severity: ewAlert.severity,
          status: ewAlert.status,
          createdAt: ewAlert.createdAt,
          triggeredAt: ewAlert.triggeredAt,
          expiresAt: ewAlert.expiresAt,
          cooldownSeconds: ewAlert.cooldownSeconds,
        };
        standardAlerts.push(priceAlert);
      }
    }

    return standardAlerts;
  }

  /**
   * Generate human-readable message for pattern detection
   */
  private generatePatternDetectionMessage(pattern: ElliottWavePattern): string {
    const confidencePercent = (pattern.confidence * 100).toFixed(1);
    const patternTypeStr = pattern.type === "impulse" ? "5-wave impulse" : "ABC corrective";
    const priceRange = `$${pattern.priceRange.low.toFixed(2)} - $${pattern.priceRange.high.toFixed(2)}`;
    
    return `New ${patternTypeStr} pattern detected with ${confidencePercent}% confidence (${priceRange})`;
  }

  /**
   * Determine alert severity based on pattern characteristics
   */
  private getPatternSeverity(pattern: ElliottWavePattern): AlertSeverity {
    if (pattern.confidence >= 0.8) {
      return AlertSeverity.Warning; // High confidence patterns
    } else if (pattern.confidence >= 0.6) {
      return AlertSeverity.Info; // Medium confidence patterns
    } else {
      return AlertSeverity.Info; // Low confidence patterns
    }
  }

  /**
   * Check if an alert key is in cooldown period
   */
  private isInCooldown(alertKey: string, cooldownMinutes: number): boolean {
    const lastAlert = this.alertHistory.get(alertKey);
    if (!lastAlert) return false;
    
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return (Date.now() - lastAlert.getTime()) < cooldownMs;
  }

  /**
   * Update alert history for cooldown management
   */
  private updateAlertHistory(alertKey: string): void {
    this.alertHistory.set(alertKey, new Date());
  }

  /**
   * Update tracking of active patterns
   */
  private updateActivePatterns(symbol: string, patterns: ElliottWavePattern[]): void {
    // Clear old patterns for this symbol
    for (const key of this.activePatterns.keys()) {
      if (key.startsWith(`${symbol}-`)) {
        this.activePatterns.delete(key);
      }
    }

    // Add new patterns
    for (const pattern of patterns) {
      this.activePatterns.set(`${symbol}-${pattern.type}`, pattern);
    }
  }

  /**
   * Get current active patterns for a symbol
   */
  public getActivePatterns(symbol: string): ElliottWavePattern[] {
    const patterns: ElliottWavePattern[] = [];
    for (const [key, pattern] of this.activePatterns.entries()) {
      if (key.startsWith(`${symbol}-`)) {
        patterns.push(pattern);
      }
    }
    return patterns;
  }

  /**
   * Clear alert history and active patterns (for testing)
   */
  public clearHistory(): void {
    this.alertHistory.clear();
    this.activePatterns.clear();
  }
}

// Create singleton instance
export const elliottWaveAlertService = new ElliottWaveAlertService();
export default elliottWaveAlertService;
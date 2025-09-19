/**
 * Domain model types that match the C# models from the backend
 */

/**
 * Indicator types that match the C# enum
 */
export enum IndicatorType {
  SimpleMovingAverage = 0,
  ExponentialMovingAverage = 1,
  RelativeStrengthIndex = 2,
  BollingerBands = 3,
  StochasticOscillator = 4,
  MACD = 5,
  WilliamsPercentR = 6,
}

/**
 * Timeframe types that match the C# enum
 */
export enum Timeframe {
  Minute = 0,
  FiveMinutes = 1,
  FifteenMinutes = 2,
  Hour = 3,
  FourHours = 4,
  Day = 5,
  Week = 6,
}

/**
 * Trend direction for multi-timeframe analysis
 */
export enum TrendDirection {
  Bearish = 0,
  Neutral = 1,
  Bullish = 2,
}

/**
 * Price data structure
 */
export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
}

/**
 * Extended crypto price data with additional market information
 */
export interface CryptoPrice {
  symbol: string;
  price: number;
  timestamp: string | Date;
  priceChange24h?: number;
  percentChange24h?: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
}

/**
 * Historical price data structure
 */
export interface HistoricalPrice {
  timestamp: Date;
  price: number;
}

/**
 * OHLC candlestick data structure
 */
export interface CandlestickData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Historical price response
 */
export interface HistoricalPriceResponse {
  symbol: string;
  timeframe: Timeframe;
  prices: HistoricalPrice[];
}

/**
 * Historical candlestick response
 */
export interface HistoricalCandlestickResponse {
  symbol: string;
  timeframe: Timeframe;
  data: CandlestickData[];
}

/**
 * Indicator data structure
 */
export interface IndicatorData {
  symbol: string;
  type: IndicatorType;
  value: number;
  startTime: Date;
  endTime: Date;
}

/**
 * Chart type enumeration
 */
export enum ChartType {
  Line = "line",
  Candlestick = "candlestick",
  Bar = "bar",
  Area = "area",
}

/**
 * Chart preferences
 */
export interface ChartPreferences {
  type: ChartType;
  timeFrame: string;
  showVolume: boolean;
  showGrid: boolean;
  colorScheme: string;
}

/**
 * Indicator preference
 */
export interface IndicatorPreference {
  type: IndicatorType;
  period: number;
  isVisible: boolean;
  color: string;
  parameters: Record<string, unknown>;
}

/**
 * UI preferences
 */
export interface UIPreferences {
  darkMode: boolean;
  language: string;
  showAdvancedFeatures: boolean;
  refreshInterval: number;
}

/**
 * User preferences
 */
export interface UserPreferences {
  userId: string;
  chart: ChartPreferences;
  indicators: IndicatorPreference[];
  favoritePairs: string[];
  ui: UIPreferences;
  lastUpdated: string;
}

/**
 * Indicator configuration for chart overlays
 */
export interface IndicatorConfig {
  type: IndicatorType;
  period: number;
  color: string;
  enabled: boolean;
  parameters?: Record<string, unknown>;
}

/**
 * Multi-timeframe indicator result for a specific timeframe
 */
export interface TimeframeIndicatorResult {
  value: number;
  startTime: string;
  endTime: string;
}

/**
 * Timeframe alignment analysis
 */
export interface TimeframeAlignmentResponse {
  alignmentScore: number;
  trendDirection: TrendDirection;
  indicatorValues: Record<Timeframe, number>;
  strongestTimeframe?: Timeframe;
  weakestTimeframe?: Timeframe;
  confluenceStrength: number;
  isStrongConfluence: boolean;
}

/**
 * Multi-timeframe indicator analysis response
 */
export interface MultiTimeframeIndicatorResponse {
  symbol: string;
  indicatorType: IndicatorType;
  period: number;
  results: Record<Timeframe, TimeframeIndicatorResult>;
  alignment: TimeframeAlignmentResponse;
  startTime: string;
  endTime: string;
}

/**
 * Alert condition types
 */
export enum AlertCondition {
  PriceAbove = 0,
  PriceBelow = 1,
  RSIAbove = 2,
  RSIBelow = 3,
  VolumeAbove = 4,
  PriceChangeAbove = 5,
  PriceChangeBelow = 6,
  // Elliott Wave Pattern Alerts
  ElliottWaveImpulseDetected = 7,
  ElliottWaveCorrectiveDetected = 8,
  FibonacciLevelApproached = 9,
  WaveTargetReached = 10,
  PatternValidationChanged = 11,
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  Info = 0,
  Warning = 1,
  Critical = 2,
}

/**
 * Alert status
 */
export enum AlertStatus {
  Active = 0,
  Triggered = 1,
  Disabled = 2,
  Expired = 3,
}

/**
 * Price alert configuration
 */
export interface PriceAlert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  targetValue: number;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  triggeredAt?: string;
  expiresAt?: string;
  cooldownSeconds?: number;
}

/**
 * Technical indicator alert configuration
 */
export interface IndicatorAlert {
  id: string;
  symbol: string;
  indicatorType: IndicatorType;
  period: number;
  condition: AlertCondition;
  targetValue: number;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  triggeredAt?: string;
  expiresAt?: string;
  cooldownSeconds?: number;
}

/**
 * Triggered alert notification
 */
export interface AlertNotification {
  id: string;
  alertId: string;
  symbol: string;
  message: string;
  severity: AlertSeverity;
  triggeredAt: string;
  currentValue: number;
  targetValue: number;
  condition: AlertCondition;
  isRead: boolean;
}

/**
 * Real-time alert notification from SignalR
 * This matches the format sent by AlertNotificationService in the backend
 */
export interface SignalRAlertNotification {
  AlertId: string;
  UserId: string;
  Symbol: string;
  Title: string;
  Message: string;
  Threshold: number;
  Condition: string;
  TriggerPrice: number;
  TriggerTime: string;
  Type: "alert_triggered";
}

/**
 * Elliott Wave Analysis Types
 */

/**
 * Wave types in Elliott Wave theory
 */
export enum WaveType {
  Impulse = "impulse",
  Corrective = "corrective",
}

/**
 * Individual wave within an Elliott Wave pattern
 */
export interface Wave {
  label: string; // "1", "2", "3", "4", "5" for impulse; "A", "B", "C" for corrective
  start: {
    timestamp: Date;
    price: number;
    index: number;
  };
  end: {
    timestamp: Date;
    price: number;
    index: number;
  };
  direction: "up" | "down";
  retracement?: number; // For corrective waves, retracement percentage
  extension?: number; // For extension waves
}

/**
 * Fibonacci analysis for waves
 */
export interface FibonacciAnalysis {
  retracements: number[]; // Standard levels: [0.236, 0.382, 0.5, 0.618, 0.786]
  extensions: number[]; // Extension levels: [1.272, 1.618, 2.618]
  levels: Record<number, number>; // Actual price levels for each ratio
}

/**
 * Wave relationship analysis
 */
export interface WaveRelationships {
  wave3ToWave1Ratio: number;
  wave5ToWave1Ratio: number;
  wave2RetracePercent: number;
  wave4RetracePercent: number;
}

/**
 * Elliott Wave pattern validation rules
 */
export interface ElliottWaveValidation {
  wave2NoOverlap: boolean; // Wave 2 doesn't retrace more than 100% of wave 1
  wave4NoOverlapWithWave1: boolean; // Wave 4 doesn't overlap with wave 1 price territory
  wave3IsNotShortest: boolean; // Wave 3 is never the shortest impulse wave
  alternation: boolean; // Waves 2 and 4 are different types of corrections
}

/**
 * Complete Elliott Wave pattern
 */
export interface ElliottWavePattern {
  id: string;
  type: "impulse" | "abc_correction" | "complex_correction";
  waves: Wave[];
  startTime: Date;
  endTime: Date;
  priceRange: {
    high: number;
    low: number;
  };
  fibonacciLevels: FibonacciAnalysis;
  fibonacciRelationships?: WaveRelationships; // For impulse waves
  confidence: number; // 0-1 confidence score
  validationRules: ElliottWaveValidation;
  projections?: {
    nextWaveTarget?: number;
    supportLevels: number[];
    resistanceLevels: number[];
  };
}

/**
 * Elliott Wave analysis result for a symbol/timeframe
 */
export interface ElliottWaveAnalysis {
  symbol: string;
  timeframe: Timeframe;
  patterns: ElliottWavePattern[];
  currentPhase?: {
    pattern: ElliottWavePattern;
    currentWave: Wave;
    nextWaveExpectation: string;
  };
  fibonacciLevels: {
    retracements: FibonacciAnalysis;
    extensions: FibonacciAnalysis;
  };
  lastUpdated: Date;
}

/**
 * Elliott Wave pattern alert configuration
 */
export interface ElliottWaveAlert {
  id: string;
  symbol: string;
  alertType: "pattern_detected" | "fibonacci_level" | "wave_target" | "pattern_validation";
  condition: AlertCondition;
  patternType?: "impulse" | "abc_correction";
  fibonacciLevel?: number; // e.g., 0.382, 0.618
  waveLabel?: string; // e.g., "3", "5", "A", "B", "C"
  targetPrice?: number;
  minimumConfidence: number; // 0-1, minimum pattern confidence to trigger alert
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  triggeredAt?: string;
  expiresAt?: string;
  cooldownSeconds?: number;
  patternId?: string; // Reference to the Elliott Wave pattern that triggered this alert
}

/**
 * Alert system configuration
 */
export interface AlertConfig {
  enableBrowserNotifications: boolean;
  enableSoundNotifications: boolean;
  maxActiveAlerts: number;
  defaultExpiryHours: number;
  autoMarkAsRead: boolean;
  elliottWaveAlerts: {
    enabled: boolean;
    minimumConfidence: number;
    fibonacciLevelsToWatch: number[];
    cooldownMinutes: number;
  };
}

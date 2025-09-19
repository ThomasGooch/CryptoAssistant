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
 * Alert system configuration
 */
export interface AlertConfig {
  enableBrowserNotifications: boolean;
  enableSoundNotifications: boolean;
  maxActiveAlerts: number;
  defaultExpiryHours: number;
  autoMarkAsRead: boolean;
}

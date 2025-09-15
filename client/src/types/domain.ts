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
 * Price data structure
 */
export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
}

/**
 * Historical price data structure
 */
export interface HistoricalPrice {
  timestamp: Date;
  price: number;
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

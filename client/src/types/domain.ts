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
  StochasticOscillator = 4
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
  Week = 6
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
 * Indicator data structure
 */
export interface IndicatorData {
  symbol: string;
  type: IndicatorType;
  value: number;
  startTime: Date;
  endTime: Date;
}

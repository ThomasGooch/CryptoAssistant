import type { CryptoPrice } from "../types/domain";
import { IndicatorType } from "../types/domain";

interface IndicatorValue {
  value: number;
  timestamp: Date | string;
}

interface StreamingIndicatorState {
  prices: number[];
  timestamps: (Date | string)[];
  period: number;
  lastValue: number | null;
  // Additional state for specific indicators
  gains?: number[];
  losses?: number[];
  avgGain?: number;
  avgLoss?: number;
  previousClose?: number;
  ema?: number;
  // Bollinger Bands state
  sma?: number;
  standardDeviation?: number;
  // MACD state
  emaFast?: number;
  emaSlow?: number;
  macdEma?: number;
  // Stochastic state
  highestHigh?: number;
  lowestLow?: number;
  kValues?: number[];
  // Williams %R state
  periodHigh?: number;
  periodLow?: number;
}

/**
 * Service for calculating technical indicators in real-time as new price data arrives
 */
class StreamingIndicatorService {
  private indicatorStates = new Map<string, StreamingIndicatorState>();
  private callbacks = new Map<string, (value: IndicatorValue) => void>();

  /**
   * Initialize an indicator for streaming calculations
   */
  public initializeIndicator(
    symbol: string,
    type: IndicatorType,
    period: number,
    initialPrices?: CryptoPrice[],
  ): string {
    const key = this.getIndicatorKey(symbol, type, period);

    const state: StreamingIndicatorState = {
      prices: [],
      timestamps: [],
      period,
      lastValue: null,
    };

    // Initialize with historical data if provided
    if (initialPrices && initialPrices.length > 0) {
      const sortedPrices = [...initialPrices].sort((a, b) => {
        const timestampA =
          typeof a.timestamp === "string" ? new Date(a.timestamp) : a.timestamp;
        const timestampB =
          typeof b.timestamp === "string" ? new Date(b.timestamp) : b.timestamp;
        return timestampA.getTime() - timestampB.getTime();
      });

      for (const price of sortedPrices) {
        state.prices.push(price.price);
        state.timestamps.push(price.timestamp);
      }

      // Keep only the most recent data up to the period requirement
      const maxDataPoints = Math.max(period * 2, 100); // Keep extra data for accuracy
      if (state.prices.length > maxDataPoints) {
        state.prices = state.prices.slice(-maxDataPoints);
        state.timestamps = state.timestamps.slice(-maxDataPoints);
      }

      // Initialize indicator-specific state
      this.initializeIndicatorSpecificState(type, state);

      // Calculate initial value if we have enough data
      if (state.prices.length >= period) {
        const initialValue = this.calculateIndicatorValue(type, state);
        if (initialValue !== null) {
          state.lastValue = initialValue;
        }
      }
    }

    this.indicatorStates.set(key, state);
    return key;
  }

  /**
   * Update an indicator with a new price data point
   */
  public updateIndicator(
    symbol: string,
    type: IndicatorType,
    period: number,
    newPrice: CryptoPrice,
  ): IndicatorValue | null {
    const key = this.getIndicatorKey(symbol, type, period);
    const state = this.indicatorStates.get(key);

    if (!state) {
      // Initialize if doesn't exist
      this.initializeIndicator(symbol, type, period, [newPrice]);
      return null;
    }

    // Add new price data
    state.prices.push(newPrice.price);
    state.timestamps.push(newPrice.timestamp);

    // Keep only the most recent data
    const maxDataPoints = Math.max(period * 2, 100);
    if (state.prices.length > maxDataPoints) {
      state.prices.shift();
      state.timestamps.shift();
    }

    // Calculate new indicator value
    const newValue = this.calculateIndicatorValue(type, state);
    if (newValue !== null) {
      state.lastValue = newValue;

      const indicatorValue: IndicatorValue = {
        value: newValue,
        timestamp: newPrice.timestamp,
      };

      // Notify callback if registered
      const callback = this.callbacks.get(key);
      if (callback) {
        callback(indicatorValue);
      }

      return indicatorValue;
    }

    return null;
  }

  /**
   * Subscribe to indicator value updates
   */
  public subscribeToIndicator(
    symbol: string,
    type: IndicatorType,
    period: number,
    callback: (value: IndicatorValue) => void,
  ): string {
    const key = this.getIndicatorKey(symbol, type, period);
    this.callbacks.set(key, callback);
    return key;
  }

  /**
   * Unsubscribe from indicator updates
   */
  public unsubscribeFromIndicator(key: string): void {
    this.callbacks.delete(key);
  }

  /**
   * Get current indicator value
   */
  public getCurrentValue(
    symbol: string,
    type: IndicatorType,
    period: number,
  ): number | null {
    const key = this.getIndicatorKey(symbol, type, period);
    const state = this.indicatorStates.get(key);
    return state?.lastValue || null;
  }

  /**
   * Clear all indicator states and callbacks
   */
  public clearAll(): void {
    this.indicatorStates.clear();
    this.callbacks.clear();
  }

  private getIndicatorKey(
    symbol: string,
    type: IndicatorType,
    period: number,
  ): string {
    return `${symbol.toUpperCase()}_${type}_${period}`;
  }

  private initializeIndicatorSpecificState(
    type: IndicatorType,
    state: StreamingIndicatorState,
  ): void {
    switch (type) {
      case IndicatorType.RelativeStrengthIndex:
        state.gains = [];
        state.losses = [];
        state.avgGain = 0;
        state.avgLoss = 0;
        break;
      case IndicatorType.ExponentialMovingAverage:
        // EMA will be initialized on first calculation
        break;
      case IndicatorType.BollingerBands:
        // Bollinger Bands will use SMA and standard deviation
        break;
      case IndicatorType.MACD:
        // MACD uses EMAs (typically 12 and 26 periods)
        break;
      case IndicatorType.StochasticOscillator:
        state.kValues = [];
        break;
      case IndicatorType.WilliamsPercentR:
        // Williams %R uses highest high and lowest low
        break;
    }
  }

  private calculateIndicatorValue(
    type: IndicatorType,
    state: StreamingIndicatorState,
  ): number | null {
    if (state.prices.length < state.period) {
      return null;
    }

    switch (type) {
      case IndicatorType.SimpleMovingAverage:
        return this.calculateSMA(state);
      case IndicatorType.ExponentialMovingAverage:
        return this.calculateEMA(state);
      case IndicatorType.RelativeStrengthIndex:
        return this.calculateRSI(state);
      case IndicatorType.BollingerBands:
        return this.calculateBollingerBands(state);
      case IndicatorType.MACD:
        return this.calculateMACD(state);
      case IndicatorType.StochasticOscillator:
        return this.calculateStochastic(state);
      case IndicatorType.WilliamsPercentR:
        return this.calculateWilliamsR(state);
      default:
        return null;
    }
  }

  private calculateSMA(state: StreamingIndicatorState): number {
    const recentPrices = state.prices.slice(-state.period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    return sum / state.period;
  }

  private calculateEMA(state: StreamingIndicatorState): number {
    const prices = state.prices;
    const period = state.period;
    const multiplier = 2 / (period + 1);

    // Initialize EMA with SMA if not set
    if (state.ema === undefined) {
      if (prices.length < period) return prices[prices.length - 1];

      const smaValues = prices.slice(0, period);
      state.ema = smaValues.reduce((acc, price) => acc + price, 0) / period;

      // Calculate EMA for remaining values
      for (let i = period; i < prices.length; i++) {
        state.ema = prices[i] * multiplier + state.ema * (1 - multiplier);
      }

      return state.ema;
    }

    // Update EMA with latest price
    const latestPrice = prices[prices.length - 1];
    state.ema = latestPrice * multiplier + state.ema * (1 - multiplier);
    return state.ema;
  }

  private calculateRSI(state: StreamingIndicatorState): number {
    const prices = state.prices;
    const period = state.period;

    if (prices.length < period + 1) return 50; // Not enough data

    // Calculate price changes
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    // Use Wilder's smoothing method for more accurate RSI
    if (!state.avgGain || !state.avgLoss) {
      // Initial calculation
      const recentChanges = changes.slice(-period);
      const gains = recentChanges.filter((change) => change > 0);
      const losses = recentChanges.filter((change) => change < 0).map(Math.abs);

      state.avgGain =
        gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
      state.avgLoss =
        losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
    } else {
      // Update with latest change using Wilder's smoothing
      const latestChange = changes[changes.length - 1];
      const gain = latestChange > 0 ? latestChange : 0;
      const loss = latestChange < 0 ? Math.abs(latestChange) : 0;

      state.avgGain = (state.avgGain * (period - 1) + gain) / period;
      state.avgLoss = (state.avgLoss * (period - 1) + loss) / period;
    }

    // Calculate RSI
    if (state.avgLoss === 0) {
      return state.avgGain === 0 ? 50 : 100;
    }

    const rs = state.avgGain / state.avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateBollingerBands(state: StreamingIndicatorState): number {
    // For Bollinger Bands, we return the middle band (SMA)
    // In a more complete implementation, you might return an object with upper, middle, and lower bands
    const recentPrices = state.prices.slice(-state.period);
    const sma =
      recentPrices.reduce((acc, price) => acc + price, 0) / state.period;

    // Calculate standard deviation
    const variance =
      recentPrices.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) /
      state.period;
    const standardDeviation = Math.sqrt(variance);

    state.sma = sma;
    state.standardDeviation = standardDeviation;

    return sma; // Return middle band
  }

  private calculateMACD(state: StreamingIndicatorState): number {
    // MACD typically uses 12-period EMA - 26-period EMA
    // For simplicity, we'll use the period as fast EMA and period*2 as slow EMA
    const fastPeriod = state.period;
    const slowPeriod = state.period * 2;
    // Note: signalPeriod would be used for MACD signal line calculation in a full implementation

    if (state.prices.length < slowPeriod) return 0;

    // Calculate fast EMA
    const fastMultiplier = 2 / (fastPeriod + 1);
    if (state.emaFast === undefined) {
      const fastSmaValues = state.prices.slice(-fastPeriod);
      state.emaFast =
        fastSmaValues.reduce((acc, price) => acc + price, 0) / fastPeriod;
    } else {
      const latestPrice = state.prices[state.prices.length - 1];
      state.emaFast =
        latestPrice * fastMultiplier + state.emaFast * (1 - fastMultiplier);
    }

    // Calculate slow EMA
    const slowMultiplier = 2 / (slowPeriod + 1);
    if (state.emaSlow === undefined) {
      const slowSmaValues = state.prices.slice(-slowPeriod);
      state.emaSlow =
        slowSmaValues.reduce((acc, price) => acc + price, 0) / slowPeriod;
    } else {
      const latestPrice = state.prices[state.prices.length - 1];
      state.emaSlow =
        latestPrice * slowMultiplier + state.emaSlow * (1 - slowMultiplier);
    }

    // MACD line = Fast EMA - Slow EMA
    const macdLine = state.emaFast - state.emaSlow;

    return macdLine;
  }

  private calculateStochastic(state: StreamingIndicatorState): number {
    const recentPrices = state.prices.slice(-state.period);
    const currentPrice = recentPrices[recentPrices.length - 1];

    const highestHigh = Math.max(...recentPrices);
    const lowestLow = Math.min(...recentPrices);

    state.highestHigh = highestHigh;
    state.lowestLow = lowestLow;

    if (highestHigh === lowestLow) return 50; // Avoid division by zero

    // %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) * 100
    const percentK =
      ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;

    return percentK;
  }

  private calculateWilliamsR(state: StreamingIndicatorState): number {
    const recentPrices = state.prices.slice(-state.period);
    const currentPrice = recentPrices[recentPrices.length - 1];

    const periodHigh = Math.max(...recentPrices);
    const periodLow = Math.min(...recentPrices);

    state.periodHigh = periodHigh;
    state.periodLow = periodLow;

    if (periodHigh === periodLow) return -50; // Avoid division by zero

    // Williams %R = (Highest High - Current Close) / (Highest High - Lowest Low) * -100
    const williamsR =
      ((periodHigh - currentPrice) / (periodHigh - periodLow)) * -100;

    return williamsR;
  }
}

// Create singleton instance
export const streamingIndicatorService = new StreamingIndicatorService();
export default streamingIndicatorService;

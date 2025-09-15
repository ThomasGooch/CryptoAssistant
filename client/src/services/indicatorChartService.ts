import { cryptoService } from "./cryptoService";
import { Timeframe } from "../types/domain";

export interface IndicatorChartData {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor?: string;
  fill?: boolean;
  tension?: number;
  yAxisID?: string;
  pointRadius?: number;
}

export interface BollingerBandsData {
  upper: IndicatorChartData;
  middle: IndicatorChartData;
  lower: IndicatorChartData;
}

export interface MACDData {
  macd: IndicatorChartData;
  signal: IndicatorChartData;
  histogram: IndicatorChartData;
}

/**
 * Service for generating indicator data specifically for chart overlays
 */
class IndicatorChartService {
  /**
   * Generate Simple Moving Average data for chart overlay
   */
  public async getSMAData(
    symbol: string,
    timeframe: Timeframe,
    period: number,
    color: string = "rgba(255, 165, 0, 1)"
  ): Promise<IndicatorChartData> {
    // Get historical prices to calculate SMA
    const historicalResponse = await cryptoService.getHistoricalPrices(symbol, timeframe);
    const prices = historicalResponse.prices;
    
    const smaData = this.calculateSMA(prices.map(p => p.price), period);
    
    return {
      label: `SMA(${period})`,
      data: smaData,
      borderColor: color,
      backgroundColor: color.replace('1)', '0.1)'),
      fill: false,
      tension: 0.4,
      pointRadius: 0,
    };
  }

  /**
   * Generate Exponential Moving Average data for chart overlay
   */
  public async getEMAData(
    symbol: string,
    timeframe: Timeframe,
    period: number,
    color: string = "rgba(255, 99, 132, 1)"
  ): Promise<IndicatorChartData> {
    const historicalResponse = await cryptoService.getHistoricalPrices(symbol, timeframe);
    const prices = historicalResponse.prices;
    
    const emaData = this.calculateEMA(prices.map(p => p.price), period);
    
    return {
      label: `EMA(${period})`,
      data: emaData,
      borderColor: color,
      backgroundColor: color.replace('1)', '0.1)'),
      fill: false,
      tension: 0.4,
      pointRadius: 0,
    };
  }

  /**
   * Generate RSI data for chart overlay (separate Y axis)
   */
  public async getRSIData(
    symbol: string,
    timeframe: Timeframe,
    period: number,
    color: string = "rgba(138, 43, 226, 1)"
  ): Promise<IndicatorChartData> {
    const historicalResponse = await cryptoService.getHistoricalPrices(symbol, timeframe);
    const prices = historicalResponse.prices;
    
    const rsiData = this.calculateRSI(prices.map(p => p.price), period);
    
    return {
      label: `RSI(${period})`,
      data: rsiData,
      borderColor: color,
      backgroundColor: color.replace('1)', '0.1)'),
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      yAxisID: 'rsi', // Use separate Y axis for RSI (0-100 range)
    };
  }

  /**
   * Generate Bollinger Bands data for chart overlay
   */
  public async getBollingerBandsData(
    symbol: string,
    timeframe: Timeframe,
    period: number = 20,
    standardDeviations: number = 2
  ): Promise<BollingerBandsData> {
    const historicalResponse = await cryptoService.getHistoricalPrices(symbol, timeframe);
    const prices = historicalResponse.prices;
    
    const { upper, middle, lower } = this.calculateBollingerBands(
      prices.map(p => p.price), 
      period, 
      standardDeviations
    );
    
    return {
      upper: {
        label: 'Bollinger Upper',
        data: upper,
        borderColor: 'rgba(255, 99, 132, 0.8)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      },
      middle: {
        label: `Bollinger SMA(${period})`,
        data: middle,
        borderColor: 'rgba(255, 206, 86, 0.8)',
        backgroundColor: 'rgba(255, 206, 86, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      },
      lower: {
        label: 'Bollinger Lower',
        data: lower,
        borderColor: 'rgba(75, 192, 192, 0.8)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: false, // Fill between upper and lower bands
        tension: 0.4,
        pointRadius: 0,
      },
    };
  }

  /**
   * Generate MACD data for chart overlay (separate Y axis)
   */
  public async getMACDData(
    symbol: string,
    timeframe: Timeframe,
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): Promise<MACDData> {
    const historicalResponse = await cryptoService.getHistoricalPrices(symbol, timeframe);
    const prices = historicalResponse.prices;
    
    const { macdLine, signalLine, histogram } = this.calculateMACD(
      prices.map(p => p.price),
      fastPeriod,
      slowPeriod,
      signalPeriod
    );
    
    return {
      macd: {
        label: 'MACD',
        data: macdLine,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        yAxisID: 'macd',
      },
      signal: {
        label: 'Signal',
        data: signalLine,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        yAxisID: 'macd',
      },
      histogram: {
        label: 'Histogram',
        data: histogram,
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.3)',
        fill: true,
        tension: 0,
        pointRadius: 0,
        yAxisID: 'macd',
      },
    };
  }

  // ========================================
  // CALCULATION METHODS
  // ========================================

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(NaN); // Not enough data points
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    
    return sma;
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        ema.push(prices[i]);
      } else {
        ema.push((prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
      }
    }
    
    return ema;
  }

  /**
   * Calculate Relative Strength Index
   */
  private calculateRSI(prices: number[], period: number): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    // Calculate RSI
    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        rsi.push(NaN);
      } else {
        const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) {
          rsi.push(100);
        } else {
          const rs = avgGain / avgLoss;
          rsi.push(100 - (100 / (1 + rs)));
        }
      }
    }
    
    return rsi;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(
    prices: number[], 
    period: number, 
    standardDeviations: number
  ): { upper: number[], middle: number[], lower: number[] } {
    const middle = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const priceSlice = prices.slice(i - period + 1, i + 1);
        const mean = middle[i];
        const variance = priceSlice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        upper.push(mean + (standardDeviations * stdDev));
        lower.push(mean - (standardDeviations * stdDev));
      }
    }
    
    return { upper, middle, lower };
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(
    prices: number[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): { macdLine: number[], signalLine: number[], histogram: number[] } {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // MACD Line = Fast EMA - Slow EMA
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
    
    // Signal Line = EMA of MACD Line
    const signalLine = this.calculateEMA(macdLine.filter(val => !isNaN(val)), signalPeriod);
    
    // Pad signal line with NaNs to match length
    const paddedSignalLine = [...Array(macdLine.length - signalLine.length).fill(NaN), ...signalLine];
    
    // Histogram = MACD Line - Signal Line
    const histogram = macdLine.map((macd, i) => macd - (paddedSignalLine[i] || 0));
    
    return { macdLine, signalLine: paddedSignalLine, histogram };
  }
}

// Create singleton instance
export const indicatorChartService = new IndicatorChartService();
export default indicatorChartService;
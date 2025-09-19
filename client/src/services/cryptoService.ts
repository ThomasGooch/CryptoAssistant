import type {
  CryptoPriceResponse,
  HistoricalCandlestickResponse,
} from "../types/api";
import type {
  HistoricalPriceResponse,
  HistoricalCandlestickResponse as DomainHistoricalCandlestickResponse,
  CandlestickData,
} from "../types/domain";
import { Timeframe } from "../types/domain";
import { isDevelopment, showBackendUnavailableNotice } from "../utils/environment";

/**
 * Service for interacting with the crypto API endpoints
 */
class CryptoService {
  private baseUrl = "/api/Crypto";
  private mockDataEnabled = false;
  private hasShownBackendNotice = false;

  /**
   * Get the current price for a cryptocurrency
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @returns Promise with the price response
   */
  public async getCurrentPrice(symbol: string): Promise<CryptoPriceResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/price/${symbol}`);
      if (!response.ok) {
        console.warn(`Backend price service unavailable (${response.status}): ${response.statusText}. Using mock data.`);
        return this.getMockCurrentPrice(symbol);
      }
      return await response.json();
    } catch (error) {
      console.warn("Backend price service unavailable:", error instanceof Error ? error.message : error, ". Using mock data.");
      
      // Show helpful notice in development mode (only once)
      if (isDevelopment() && !this.hasShownBackendNotice) {
        showBackendUnavailableNotice();
        this.hasShownBackendNotice = true;
      }
      
      return this.getMockCurrentPrice(symbol);
    }
  }

  /**
   * Get historical prices for a cryptocurrency
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param timeframe The timeframe for historical data
   * @returns Promise with the historical price response
   */
  public async getHistoricalPrices(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<HistoricalPriceResponse> {
    try {
      // Calculate start and end times based on timeframe
      const endTime = new Date();
      const startTime = this.calculateStartTime(endTime, timeframe);

      // Format dates as ISO strings for the API
      const startTimeStr = startTime.toISOString();
      const endTimeStr = endTime.toISOString();

      const response = await fetch(
        `${this.baseUrl}/historical/${symbol}?startTime=${encodeURIComponent(startTimeStr)}&endTime=${encodeURIComponent(endTimeStr)}`,
      );
      if (!response.ok) {
        console.warn(`Backend historical prices service unavailable (${response.status}): ${response.statusText}. Using mock data.`);
        return this.getMockHistoricalPrices(symbol, timeframe);
      }
      return await response.json();
    } catch (error) {
      console.warn("Backend historical prices service unavailable:", error instanceof Error ? error.message : error, ". Using mock data.");
      return this.getMockHistoricalPrices(symbol, timeframe);
    }
  }

  /**
   * Calculate start time based on timeframe and end time
   * @param endTime The end time
   * @param timeframe The timeframe
   * @returns The calculated start time
   */
  private calculateStartTime(endTime: Date, timeframe: Timeframe): Date {
    const startTime = new Date(endTime);

    switch (timeframe) {
      case Timeframe.Minute:
        // Last hour
        startTime.setHours(startTime.getHours() - 1);
        break;
      case Timeframe.FiveMinutes:
        // Last 6 hours
        startTime.setHours(startTime.getHours() - 6);
        break;
      case Timeframe.FifteenMinutes:
        // Last 12 hours
        startTime.setHours(startTime.getHours() - 12);
        break;
      case Timeframe.Hour:
        // Last 24 hours
        startTime.setHours(startTime.getHours() - 24);
        break;
      case Timeframe.FourHours:
        // Last 3 days
        startTime.setDate(startTime.getDate() - 3);
        break;
      case Timeframe.Day:
        // Last 7 days
        startTime.setDate(startTime.getDate() - 7);
        break;
      case Timeframe.Week:
        // Last 4 weeks
        startTime.setDate(startTime.getDate() - 28);
        break;
      default:
        // Default to last 24 hours
        startTime.setHours(startTime.getHours() - 24);
    }

    return startTime;
  }

  /**
   * Get historical candlestick data for a cryptocurrency
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param timeframe The timeframe for historical data
   * @returns Promise with the historical candlestick response
   */
  public async getHistoricalCandlestickData(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<DomainHistoricalCandlestickResponse> {
    try {
      // Calculate start and end times based on timeframe
      const endTime = new Date();
      const startTime = this.calculateStartTime(endTime, timeframe);

      // Format dates as ISO strings for the API
      const startTimeStr = startTime.toISOString();
      const endTimeStr = endTime.toISOString();

      const response = await fetch(
        `${this.baseUrl}/candlestick/${symbol}?startTime=${encodeURIComponent(startTimeStr)}&endTime=${encodeURIComponent(endTimeStr)}`,
      );
      if (!response.ok) {
        console.warn(`Backend candlestick service unavailable (${response.status}): ${response.statusText}. Using mock data.`);
        return this.getMockCandlestickData(symbol, timeframe);
      }

      const apiResponse: HistoricalCandlestickResponse = await response.json();

      // Transform API response to domain model
      return {
        symbol: apiResponse.symbol,
        timeframe,
        data: apiResponse.data.map((item) => ({
          timestamp: new Date(item.timestamp),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        })),
      };
    } catch (error) {
      console.warn("Backend candlestick service unavailable:", error instanceof Error ? error.message : error, ". Using mock data.");
      return this.getMockCandlestickData(symbol, timeframe);
    }
  }

  /**
   * Generate mock current price data
   */
  private getMockCurrentPrice(symbol: string): CryptoPriceResponse {
    const basePrices: Record<string, number> = {
      'BTC': 45000,
      'ETH': 2800,
      'ADA': 0.52,
      'SOL': 98.50,
    };

    const basePrice = basePrices[symbol] || 100;
    const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% random variation
    const currentPrice = basePrice * (1 + randomVariation);

    return {
      symbol,
      price: Number(currentPrice.toFixed(2)),
      timestamp: new Date().toISOString(),
      source: 'mock',
    };
  }

  /**
   * Generate mock historical price data
   */
  private getMockHistoricalPrices(symbol: string, timeframe: Timeframe): HistoricalPriceResponse {
    const endTime = new Date();
    const startTime = this.calculateStartTime(endTime, timeframe);
    const currentPrice = this.getMockCurrentPrice(symbol);
    
    const dataPoints = this.generateMockPricePoints(startTime, endTime, currentPrice.price, timeframe);

    return {
      symbol,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timeframe: this.mapTimeframeToString(timeframe),
      prices: dataPoints.map(point => ({
        timestamp: point.timestamp.toISOString(),
        price: point.price,
      })),
    };
  }

  /**
   * Generate mock candlestick data with realistic Elliott Wave patterns
   */
  private getMockCandlestickData(symbol: string, timeframe: Timeframe): DomainHistoricalCandlestickResponse {
    const endTime = new Date();
    const startTime = this.calculateStartTime(endTime, timeframe);
    const currentPrice = this.getMockCurrentPrice(symbol);
    
    const candlesticks = this.generateMockCandlesticks(startTime, endTime, currentPrice.price, timeframe);

    return {
      symbol,
      timeframe,
      data: candlesticks,
    };
  }

  /**
   * Generate mock price points for line charts
   */
  private generateMockPricePoints(startTime: Date, endTime: Date, basePrice: number, timeframe: Timeframe): Array<{timestamp: Date, price: number}> {
    const points: Array<{timestamp: Date, price: number}> = [];
    const duration = endTime.getTime() - startTime.getTime();
    const intervalMs = this.getIntervalMs(timeframe);
    const numPoints = Math.floor(duration / intervalMs);

    let currentPrice = basePrice;
    const trend = (Math.random() - 0.5) * 0.2; // Overall trend ±10%

    for (let i = 0; i <= numPoints; i++) {
      const timestamp = new Date(startTime.getTime() + (i * intervalMs));
      
      // Add trend and random walk
      const randomWalk = (Math.random() - 0.5) * 0.02; // ±1% random walk
      const trendComponent = trend * (i / numPoints);
      currentPrice = currentPrice * (1 + trendComponent + randomWalk);

      points.push({
        timestamp,
        price: Number(currentPrice.toFixed(2)),
      });
    }

    return points;
  }

  /**
   * Generate mock candlestick data with Elliott Wave characteristics
   */
  private generateMockCandlesticks(startTime: Date, endTime: Date, basePrice: number, timeframe: Timeframe): CandlestickData[] {
    const candlesticks: CandlestickData[] = [];
    const duration = endTime.getTime() - startTime.getTime();
    const intervalMs = this.getIntervalMs(timeframe);
    const numCandles = Math.floor(duration / intervalMs);

    let currentPrice = basePrice;
    
    // Generate Elliott Wave pattern (5 impulse waves)
    const wavePattern = this.generateElliottWavePattern(numCandles);

    for (let i = 0; i < numCandles; i++) {
      const timestamp = new Date(startTime.getTime() + (i * intervalMs));
      const waveMultiplier = wavePattern[i] || 1;
      
      const open = currentPrice;
      const volatility = basePrice * 0.02; // 2% volatility
      const direction = Math.sign(waveMultiplier - 1) || (Math.random() > 0.5 ? 1 : -1);
      
      const bodySize = volatility * Math.abs(waveMultiplier - 1) * (0.5 + Math.random() * 0.5);
      const close = open + (bodySize * direction);
      
      const wickSize = bodySize * (0.2 + Math.random() * 0.3);
      const high = Math.max(open, close) + wickSize;
      const low = Math.min(open, close) - wickSize;
      
      const volume = 1000000 + (Math.random() * 2000000); // Random volume between 1M-3M

      candlesticks.push({
        timestamp,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(volume),
      });

      currentPrice = close;
    }

    return candlesticks;
  }

  /**
   * Generate Elliott Wave price pattern multipliers
   */
  private generateElliottWavePattern(length: number): number[] {
    if (length < 20) {
      // Simple random walk for short periods
      return Array(length).fill(0).map(() => 0.99 + Math.random() * 0.02);
    }

    const pattern: number[] = [];
    const waveLength = Math.floor(length / 5);

    // Wave 1: Up
    for (let i = 0; i < waveLength; i++) {
      pattern.push(1 + (i / waveLength) * 0.03);
    }

    // Wave 2: Down (correction)
    for (let i = 0; i < waveLength; i++) {
      pattern.push(1 + 0.03 - (i / waveLength) * 0.018); // Retraces 60% of wave 1
    }

    // Wave 3: Up (strongest)
    for (let i = 0; i < waveLength; i++) {
      pattern.push(1 + 0.012 + (i / waveLength) * 0.05); // Longest and strongest
    }

    // Wave 4: Down (correction)
    for (let i = 0; i < waveLength; i++) {
      pattern.push(1 + 0.062 - (i / waveLength) * 0.015); // Shallow correction
    }

    // Wave 5: Up (final)
    const remaining = length - pattern.length;
    for (let i = 0; i < remaining; i++) {
      pattern.push(1 + 0.047 + (i / remaining) * 0.025);
    }

    return pattern;
  }

  /**
   * Get interval in milliseconds for timeframe
   */
  private getIntervalMs(timeframe: Timeframe): number {
    switch (timeframe) {
      case Timeframe.Minute: return 60 * 1000;
      case Timeframe.FiveMinutes: return 5 * 60 * 1000;
      case Timeframe.FifteenMinutes: return 15 * 60 * 1000;
      case Timeframe.Hour: return 60 * 60 * 1000;
      case Timeframe.FourHours: return 4 * 60 * 60 * 1000;
      case Timeframe.Day: return 24 * 60 * 60 * 1000;
      case Timeframe.Week: return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * Map timeframe enum to string
   */
  private mapTimeframeToString(timeframe: Timeframe): string {
    switch (timeframe) {
      case Timeframe.Minute: return '1m';
      case Timeframe.FiveMinutes: return '5m';
      case Timeframe.FifteenMinutes: return '15m';
      case Timeframe.Hour: return '1h';
      case Timeframe.FourHours: return '4h';
      case Timeframe.Day: return '1d';
      case Timeframe.Week: return '1w';
      default: return '1h';
    }
  }
}

// Create a singleton instance
export const cryptoService = new CryptoService();
export default cryptoService;

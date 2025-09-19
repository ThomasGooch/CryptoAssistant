import type { IndicatorResponse, IndicatorTypesResponse } from "../types/api";
import { IndicatorType } from "../types/domain";
import { isDevelopment, showBackendUnavailableNotice } from "../utils/environment";

/**
 * Service for interacting with the indicator API endpoints
 */
class IndicatorService {
  private baseUrl = "/api/Crypto";
  private hasShownBackendNotice = false;

  /**
   * Get indicator value for a cryptocurrency
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param type The indicator type
   * @param period The period for calculation
   * @returns Promise with the indicator response
   */
  public async getIndicator(
    symbol: string,
    type: IndicatorType,
    period: number,
  ): Promise<IndicatorResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/indicator/${symbol}?type=${type}&period=${period}`,
      );

      if (!response.ok) {
        console.warn(`Backend indicator service unavailable (${response.status}): ${response.statusText}. Using mock data.`);
        return this.getMockIndicator(symbol, type, period);
      }

      return await response.json();
    } catch (error) {
      console.warn("Backend indicator service unavailable:", error instanceof Error ? error.message : error, ". Using mock data.");
      
      // Show helpful notice in development mode (only once)
      if (isDevelopment() && !this.hasShownBackendNotice) {
        showBackendUnavailableNotice();
        this.hasShownBackendNotice = true;
      }
      
      return this.getMockIndicator(symbol, type, period);
    }
  }

  /**
   * Get all available indicator types
   * @returns Promise with the indicator types response
   */
  public async getAvailableIndicators(): Promise<IndicatorTypesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/indicators`);

      if (!response.ok) {
        console.warn(`Backend indicators service unavailable (${response.status}): ${response.statusText}. Using default indicators.`);
        return this.getDefaultAvailableIndicators();
      }

      return await response.json();
    } catch (error) {
      console.warn("Backend indicators service unavailable:", error instanceof Error ? error.message : error, ". Using default indicators.");
      return this.getDefaultAvailableIndicators();
    }
  }

  /**
   * Get the display name for an indicator type
   * @param type The indicator type
   * @returns The display name
   */
  public getIndicatorDisplayName(type: IndicatorType): string {
    switch (type) {
      case IndicatorType.SimpleMovingAverage:
        return "Simple Moving Average (SMA)";
      case IndicatorType.ExponentialMovingAverage:
        return "Exponential Moving Average (EMA)";
      case IndicatorType.RelativeStrengthIndex:
        return "Relative Strength Index (RSI)";
      case IndicatorType.BollingerBands:
        return "Bollinger Bands";
      case IndicatorType.StochasticOscillator:
        return "Stochastic Oscillator";
      case IndicatorType.MACD:
        return "MACD";
      case IndicatorType.WilliamsPercentR:
        return "Williams %R";
      default:
        return "Unknown Indicator";
    }
  }

  /**
   * Get default available indicators for fallback
   */
  private getDefaultAvailableIndicators(): IndicatorTypesResponse {
    return {
      indicators: [
        IndicatorType.SimpleMovingAverage,
        IndicatorType.ExponentialMovingAverage,
        IndicatorType.RelativeStrengthIndex,
        IndicatorType.BollingerBands,
        IndicatorType.StochasticOscillator,
        IndicatorType.MACD,
        IndicatorType.WilliamsPercentR,
      ],
    };
  }

  /**
   * Generate mock indicator data
   */
  private getMockIndicator(
    symbol: string,
    type: IndicatorType,
    period: number,
  ): IndicatorResponse {
    const value = this.calculateMockIndicatorValue(type, period);
    
    return {
      symbol,
      type,
      value,
      period,
      timestamp: new Date().toISOString(),
      source: 'mock',
    };
  }

  /**
   * Calculate realistic mock values based on indicator type
   */
  private calculateMockIndicatorValue(type: IndicatorType, period: number): number {
    const basePrice = 45000; // Assume BTC base price for calculations
    const randomFactor = 0.95 + (Math.random() * 0.1); // ±5% variation

    switch (type) {
      case IndicatorType.SimpleMovingAverage:
      case IndicatorType.ExponentialMovingAverage:
        // Moving averages should be close to current price
        return basePrice * randomFactor;

      case IndicatorType.RelativeStrengthIndex:
        // RSI: 0-100, with realistic distribution
        const rsiBase = 30 + (Math.random() * 40); // Range 30-70 (most common)
        return Math.min(100, Math.max(0, rsiBase + (Math.random() - 0.5) * 20));

      case IndicatorType.StochasticOscillator:
        // Stochastic: 0-100, similar to RSI but more volatile
        const stochBase = 20 + (Math.random() * 60); // Range 20-80
        return Math.min(100, Math.max(0, stochBase + (Math.random() - 0.5) * 30));

      case IndicatorType.BollingerBands:
        // Return middle band (SMA-like value)
        return basePrice * randomFactor;

      case IndicatorType.MACD:
        // MACD can be positive or negative, typically small values
        return (Math.random() - 0.5) * 200; // Range -100 to +100

      case IndicatorType.WilliamsPercentR:
        // Williams %R: -100 to 0
        return -Math.random() * 100;

      default:
        return basePrice * randomFactor;
    }
  }
}

// Create a singleton instance
export const indicatorService = new IndicatorService();
export default indicatorService;

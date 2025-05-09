import type { IndicatorResponse, IndicatorTypesResponse } from '../types/api';
import { IndicatorType } from '../types/domain';

/**
 * Service for interacting with the indicator API endpoints
 */
class IndicatorService {
  private baseUrl = '/api/crypto';

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
    period: number
  ): Promise<IndicatorResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/indicator/${symbol}?type=${type}&period=${period}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch indicator: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching indicator:', error);
      throw error;
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
        throw new Error(`Failed to fetch indicators: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching indicators:', error);
      throw error;
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
        return 'Simple Moving Average (SMA)';
      case IndicatorType.ExponentialMovingAverage:
        return 'Exponential Moving Average (EMA)';
      case IndicatorType.RelativeStrengthIndex:
        return 'Relative Strength Index (RSI)';
      case IndicatorType.BollingerBands:
        return 'Bollinger Bands';
      case IndicatorType.StochasticOscillator:
        return 'Stochastic Oscillator';
      default:
        return 'Unknown Indicator';
    }
  }
}

// Create a singleton instance
export const indicatorService = new IndicatorService();
export default indicatorService;

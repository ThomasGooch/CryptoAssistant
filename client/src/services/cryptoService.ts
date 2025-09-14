import type { CryptoPriceResponse } from '../types/api';
import type { HistoricalPriceResponse } from '../types/domain';
import { Timeframe } from '../types/domain';

/**
 * Service for interacting with the crypto API endpoints
 */
class CryptoService {
  private baseUrl = '/api/Crypto';

  /**
   * Get the current price for a cryptocurrency
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @returns Promise with the price response
   */
  public async getCurrentPrice(symbol: string): Promise<CryptoPriceResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/price/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching price:', error);
      throw error;
    }
  }

  /**
   * Get historical prices for a cryptocurrency
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param timeframe The timeframe for historical data
   * @returns Promise with the historical price response
   */
  public async getHistoricalPrices(symbol: string, timeframe: Timeframe): Promise<HistoricalPriceResponse> {
    try {
      // Calculate start and end times based on timeframe
      const endTime = new Date();
      const startTime = this.calculateStartTime(endTime, timeframe);
      
      // Format dates as ISO strings for the API
      const startTimeStr = startTime.toISOString();
      const endTimeStr = endTime.toISOString();
      
      const response = await fetch(`${this.baseUrl}/historical/${symbol}?startTime=${startTimeStr}&endTime=${endTimeStr}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch historical prices: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      throw error;
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
   * Test the authentication with the Coinbase API
   * @returns Promise with the authentication test response
   */
  public async testAuth(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test-auth`);
      if (!response.ok) {
        throw new Error(`Auth test failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Auth test error:', error);
      throw error;
    }
  }
}

// Create a singleton instance
export const cryptoService = new CryptoService();
export default cryptoService;

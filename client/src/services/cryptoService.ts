import type { CryptoPriceResponse } from '../types/api';

/**
 * Service for interacting with the crypto API endpoints
 */
class CryptoService {
  private baseUrl = '/api/crypto';

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
   * Test the authentication with the Coinbase API
   * @returns Promise with the authentication test response
   */
  public async testAuth(): Promise<any> {
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

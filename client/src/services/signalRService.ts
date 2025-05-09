import * as signalR from '@microsoft/signalr';
import { IndicatorType, Timeframe } from '../types/domain';

/**
 * Service for SignalR real-time connections
 */
class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private priceUpdateCallbacks: Map<string, (price: number) => void> = new Map();
  private indicatorUpdateCallbacks: Map<string, (value: number) => void> = new Map();

  /**
   * Start the SignalR connection
   * @returns Promise that resolves when connected
   */
  public async startConnection(): Promise<void> {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/price')
      .withAutomaticReconnect()
      .build();

    // Register handlers for incoming messages
    this.connection.on('ReceivePriceUpdate', (symbol: string, price: number) => {
      const callback = this.priceUpdateCallbacks.get(symbol.toLowerCase());
      if (callback) {
        callback(price);
      }
    });

    this.connection.on('ReceiveIndicatorUpdate', 
      (symbol: string, indicatorType: IndicatorType, value: number) => {
        const key = `${symbol.toLowerCase()}_${indicatorType}`;
        const callback = this.indicatorUpdateCallbacks.get(key);
        if (callback) {
          callback(value);
        }
    });

    try {
      await this.connection.start();
      console.log('SignalR connected');
    } catch (err) {
      console.error('SignalR connection error: ', err);
      throw err;
    }
  }

  /**
   * Subscribe to price updates for a symbol
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param callback Function to call when price updates are received
   */
  public async subscribeToSymbol(symbol: string, callback: (price: number) => void): Promise<void> {
    if (!this.connection) {
      throw new Error('SignalR connection not established');
    }
    
    this.priceUpdateCallbacks.set(symbol.toLowerCase(), callback);
    await this.connection.invoke('SubscribeToSymbol', symbol);
  }

  /**
   * Unsubscribe from price updates for a symbol
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   */
  public async unsubscribeFromSymbol(symbol: string): Promise<void> {
    if (!this.connection) {
      throw new Error('SignalR connection not established');
    }
    
    this.priceUpdateCallbacks.delete(symbol.toLowerCase());
    await this.connection.invoke('UnsubscribeFromSymbol', symbol);
  }

  /**
   * Subscribe to indicator updates
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param indicatorType The indicator type
   * @param period The period for calculation
   * @param callback Function to call when indicator updates are received
   * @param timeframe Optional timeframe
   */
  public async subscribeToIndicator(
    symbol: string, 
    indicatorType: IndicatorType, 
    period: number,
    callback: (value: number) => void,
    timeframe?: Timeframe
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('SignalR connection not established');
    }
    
    const key = `${symbol.toLowerCase()}_${indicatorType}`;
    this.indicatorUpdateCallbacks.set(key, callback);
    
    if (timeframe !== undefined) {
      await this.connection.invoke('SubscribeToIndicatorWithTimeframe', symbol, indicatorType, period, timeframe);
    } else {
      await this.connection.invoke('SubscribeToIndicator', symbol, indicatorType, period);
    }
  }

  /**
   * Unsubscribe from indicator updates
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param indicatorType The indicator type
   * @param timeframe Optional timeframe
   */
  public async unsubscribeFromIndicator(
    symbol: string, 
    indicatorType: IndicatorType,
    timeframe?: Timeframe
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('SignalR connection not established');
    }
    
    const key = `${symbol.toLowerCase()}_${indicatorType}`;
    this.indicatorUpdateCallbacks.delete(key);
    
    if (timeframe !== undefined) {
      await this.connection.invoke('UnsubscribeFromIndicatorWithTimeframe', symbol, indicatorType, timeframe);
    } else {
      await this.connection.invoke('UnsubscribeFromIndicator', symbol, indicatorType);
    }
  }

  /**
   * Stop the SignalR connection
   */
  public async stopConnection(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.priceUpdateCallbacks.clear();
      this.indicatorUpdateCallbacks.clear();
    }
  }
}

// Create a singleton instance
export const signalRService = new SignalRService();
export default signalRService;

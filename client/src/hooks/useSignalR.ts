import { useEffect, useState } from 'react';
import signalRService from '../services/signalRService';
import { IndicatorType, Timeframe } from '../types/domain';

/**
 * Custom hook for managing SignalR connections
 */
export const useSignalR = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Connect to SignalR when the hook is first used
  useEffect(() => {
    const connectToSignalR = async () => {
      try {
        await signalRService.startConnection();
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setIsConnected(false);
        setError(err instanceof Error ? err : new Error('Failed to connect to SignalR'));
      }
    };

    connectToSignalR();

    // Cleanup function to stop the connection when component unmounts
    return () => {
      signalRService.stopConnection();
    };
  }, []);

  /**
   * Subscribe to price updates for a symbol
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param callback Function to call when price updates are received
   */
  const subscribeToPriceUpdates = async (
    symbol: string, 
    callback: (price: number) => void
  ) => {
    if (!isConnected) {
      throw new Error('SignalR not connected');
    }
    
    try {
      await signalRService.subscribeToSymbol(symbol, callback);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to subscribe to price updates'));
      throw err;
    }
  };

  /**
   * Unsubscribe from price updates for a symbol
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   */
  const unsubscribeFromPriceUpdates = async (symbol: string) => {
    if (!isConnected) {
      return; // No need to throw if we're not connected
    }
    
    try {
      await signalRService.unsubscribeFromSymbol(symbol);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to unsubscribe from price updates'));
    }
  };

  /**
   * Subscribe to indicator updates
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param indicatorType The indicator type
   * @param period The period for calculation
   * @param callback Function to call when indicator updates are received
   * @param timeframe Optional timeframe
   */
  const subscribeToIndicatorUpdates = async (
    symbol: string,
    indicatorType: IndicatorType,
    period: number,
    callback: (value: number) => void,
    timeframe?: Timeframe
  ) => {
    if (!isConnected) {
      throw new Error('SignalR not connected');
    }
    
    try {
      await signalRService.subscribeToIndicator(
        symbol, 
        indicatorType, 
        period, 
        callback, 
        timeframe
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to subscribe to indicator updates'));
      throw err;
    }
  };

  /**
   * Unsubscribe from indicator updates
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param indicatorType The indicator type
   * @param timeframe Optional timeframe
   */
  const unsubscribeFromIndicatorUpdates = async (
    symbol: string,
    indicatorType: IndicatorType,
    timeframe?: Timeframe
  ) => {
    if (!isConnected) {
      return; // No need to throw if we're not connected
    }
    
    try {
      await signalRService.unsubscribeFromIndicator(symbol, indicatorType, timeframe);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to unsubscribe from indicator updates'));
    }
  };

  return {
    isConnected,
    error,
    subscribeToPriceUpdates,
    unsubscribeFromPriceUpdates,
    subscribeToIndicatorUpdates,
    unsubscribeFromIndicatorUpdates
  };
};

export default useSignalR;

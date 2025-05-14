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
    let mounted = true;

    const connectToSignalR = async () => {
      try {
        await signalRService.startConnection();
        if (mounted) {
          setIsConnected(true);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setIsConnected(false);
          // Only set error if it's a real error, not just disconnected
          if (err instanceof Error && err.message !== 'Connection closed') {
            setError(err);
          } else {
            setError(null);
          }
        }
      }
    };

    connectToSignalR();

    // Cleanup function to stop the connection when component unmounts
    return () => {
      mounted = false;
      signalRService.stopConnection();
    };
  }, []);

  // Clear error state when reconnected
  useEffect(() => {
    const handleReconnect = () => {
      setError(null);
    };

    signalRService.onreconnected(handleReconnect);

    // Cleanup the event handler on unmount
    return () => {
      signalRService.offreconnected(handleReconnect);
    };
  }, []);

  // Handle state changes from mockSignalR
  useEffect(() => {
    const handleStateChange = (state: { isConnected: boolean; error: Error | null }) => {
      setIsConnected(state.isConnected);
      setError(state.error);
    };

    signalRService.onStateChange(handleStateChange);

    return () => {
      signalRService.offStateChange(handleStateChange);
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

  useEffect(() => {
    console.log('useSignalR: isConnected updated to', isConnected);
    console.log('useSignalR: error updated to', error);
  }, [isConnected, error]);

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

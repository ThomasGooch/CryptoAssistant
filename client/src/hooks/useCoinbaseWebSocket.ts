import { useEffect, useState, useCallback, useRef } from "react";
import { coinbaseWebSocketService } from "../services/coinbaseWebSocketService";
import type { CryptoPrice } from "../types/domain";

interface UseCoinbaseWebSocketOptions {
  symbol?: string;
  autoConnect?: boolean;
  onPriceUpdate?: (price: CryptoPrice) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const useCoinbaseWebSocket = (
  options: UseCoinbaseWebSocketOptions = {},
) => {
  const {
    symbol,
    autoConnect = true,
    onPriceUpdate,
    onConnectionChange,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<CryptoPrice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid stale closures in callbacks
  const onPriceUpdateRef = useRef(onPriceUpdate);
  const onConnectionChangeRef = useRef(onConnectionChange);

  // Update refs when callbacks change
  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  }, [onPriceUpdate]);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  // Connection state callback
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    setError(connected ? null : "WebSocket connection lost");
    onConnectionChangeRef.current?.(connected);
  }, []);

  // Price update callback
  const handlePriceUpdate = useCallback((price: CryptoPrice) => {
    setCurrentPrice(price);
    setError(null);
    onPriceUpdateRef.current?.(price);
  }, []);

  // Connect/disconnect functions
  const connect = useCallback(async () => {
    try {
      await coinbaseWebSocketService.connect();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, []);

  const disconnect = useCallback(() => {
    coinbaseWebSocketService.disconnect();
    setIsConnected(false);
    setCurrentPrice(null);
    setError(null);
  }, []);

  // Subscribe/unsubscribe functions
  const subscribe = useCallback(
    (symbolToSubscribe: string) => {
      if (!symbolToSubscribe.trim()) {
        return;
      }
      coinbaseWebSocketService.subscribeToTicker(
        symbolToSubscribe,
        handlePriceUpdate,
      );
    },
    [handlePriceUpdate],
  );

  const unsubscribe = useCallback((symbolToUnsubscribe: string) => {
    coinbaseWebSocketService.unsubscribeFromTicker(symbolToUnsubscribe);
    setCurrentPrice(null);
  }, []);

  // Main effect for connection and subscription management
  useEffect(() => {
    // Set up connection state listener
    coinbaseWebSocketService.onConnectionStateChange(handleConnectionChange);

    if (autoConnect) {
      connect();
    }

    return () => {
      coinbaseWebSocketService.offConnectionStateChange(handleConnectionChange);
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect, handleConnectionChange]);

  // Effect for symbol subscription
  useEffect(() => {
    if (!symbol?.trim() || !isConnected) {
      return;
    }

    subscribe(symbol);

    return () => {
      unsubscribe(symbol);
    };
  }, [symbol, isConnected, subscribe, unsubscribe]);

  return {
    // State
    isConnected,
    currentPrice,
    error,

    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
};

export default useCoinbaseWebSocket;

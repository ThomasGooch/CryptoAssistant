import { useEffect, useState, useCallback, useRef } from "react";
import { streamingIndicatorService } from "../services/streamingIndicatorService";
import { alertManager } from "../services/alertManagerService";
import { alertService } from "../services/alertService";
import { cryptoService } from "../services/cryptoService";
import type {
  CryptoPrice,
  IndicatorConfig,
  IndicatorAlert,
} from "../types/domain";
import { IndicatorType, Timeframe } from "../types/domain";

interface IndicatorValue {
  value: number;
  timestamp: Date | string;
}

interface StreamingIndicatorData {
  type: IndicatorType;
  period: number;
  value: number | null;
  isInitialized: boolean;
}

interface UseStreamingIndicatorsOptions {
  symbol?: string;
  indicators?: IndicatorConfig[];
  timeframe?: Timeframe;
  enableLiveUpdates?: boolean;
}

export const useStreamingIndicators = (
  options: UseStreamingIndicatorsOptions = {},
) => {
  const {
    symbol,
    indicators = [],
    timeframe = Timeframe.Hour,
    enableLiveUpdates = true,
  } = options;

  const [indicatorData, setIndicatorData] = useState<
    Map<string, StreamingIndicatorData>
  >(new Map());
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionKeysRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  // Helper to get indicator key
  const getIndicatorKey = useCallback((type: IndicatorType, period: number) => {
    return `${type}_${period}`;
  }, []);

  // Initialize indicators with historical data
  const initializeIndicators = useCallback(async () => {
    if (
      !symbol?.trim() ||
      indicators.length === 0 ||
      isInitializedRef.current
    ) {
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Fetch historical price data for indicator initialization
      const historicalResponse = await cryptoService.getHistoricalPrices(
        symbol,
        timeframe,
      );
      const historicalPrices = historicalResponse.prices.map((price) => ({
        symbol,
        price: price.price,
        timestamp: price.timestamp,
      }));

      const newIndicatorData = new Map<string, StreamingIndicatorData>();

      for (const indicator of indicators) {
        if (!indicator.enabled) continue;

        const key = getIndicatorKey(indicator.type, indicator.period);

        // Initialize streaming indicator
        const subscriptionKey = streamingIndicatorService.initializeIndicator(
          symbol,
          indicator.type,
          indicator.period,
          historicalPrices,
        );

        subscriptionKeysRef.current.add(subscriptionKey);

        // Subscribe to updates
        streamingIndicatorService.subscribeToIndicator(
          symbol,
          indicator.type,
          indicator.period,
          (value: IndicatorValue) => {
            setIndicatorData((prev) => {
              const updated = new Map(prev);
              const existingData = updated.get(key);
              if (existingData) {
                updated.set(key, {
                  ...existingData,
                  value: value.value,
                });
              }
              return updated;
            });

            // Evaluate any configured indicator alerts (e.g., RSI) for this symbol
            try {
              const activeAlerts =
                alertManager.getActiveAlertsForSymbol(symbol);
              activeAlerts.forEach((a) => {
                try {
                  const ia = a as IndicatorAlert;
                  if (ia && ia.indicatorType !== undefined) {
                    // Only handle RSI conditions for now
                    if (ia.condition === 2 || ia.condition === 3) {
                      if (
                        alertService.evaluateIndicatorAlert(ia, value.value)
                      ) {
                        const notification = alertService.createNotification(
                          ia,
                          value.value,
                        );
                        alertService.addNotification(notification);
                      }
                    }
                  }
                } catch (err) {
                  console.warn(
                    "Error evaluating streaming indicator alert:",
                    err,
                  );
                }
              });
            } catch (e) {
              console.warn("Streaming indicator alert evaluation failed:", e);
            }
          },
        );

        // Get current value
        const currentValue = streamingIndicatorService.getCurrentValue(
          symbol,
          indicator.type,
          indicator.period,
        );

        newIndicatorData.set(key, {
          type: indicator.type,
          period: indicator.period,
          value: currentValue,
          isInitialized: currentValue !== null,
        });
      }

      setIndicatorData(newIndicatorData);
      isInitializedRef.current = true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize indicators",
      );
      console.error("Error initializing streaming indicators:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [symbol, indicators, timeframe, getIndicatorKey]);

  // Update indicators with new price data
  const updateWithNewPrice = useCallback(
    (newPrice: CryptoPrice) => {
      if (!symbol || !enableLiveUpdates || indicators.length === 0) {
        return;
      }

      for (const indicator of indicators) {
        if (!indicator.enabled) continue;

        streamingIndicatorService.updateIndicator(
          symbol,
          indicator.type,
          indicator.period,
          newPrice,
        );
      }
    },
    [symbol, indicators, enableLiveUpdates],
  );

  // Get indicator value by type and period
  const getIndicatorValue = useCallback(
    (type: IndicatorType, period: number): number | null => {
      const key = getIndicatorKey(type, period);
      return indicatorData.get(key)?.value || null;
    },
    [indicatorData, getIndicatorKey],
  );

  // Get all current indicator values
  const getAllIndicatorValues = useCallback(() => {
    const values: { [key: string]: StreamingIndicatorData } = {};
    indicatorData.forEach((data, key) => {
      values[key] = data;
    });
    return values;
  }, [indicatorData]);

  // Reset and cleanup
  const reset = useCallback(() => {
    // Unsubscribe from all indicators
    subscriptionKeysRef.current.forEach((key) => {
      streamingIndicatorService.unsubscribeFromIndicator(key);
    });
    subscriptionKeysRef.current.clear();

    setIndicatorData(new Map());
    setError(null);
    isInitializedRef.current = false;
  }, []);

  // Effect to initialize indicators when dependencies change
  useEffect(() => {
    if (symbol?.trim() && indicators.length > 0 && enableLiveUpdates) {
      reset();
      initializeIndicators();
    }

    return () => {
      reset();
    };
  }, [
    symbol,
    indicators,
    timeframe,
    enableLiveUpdates,
    initializeIndicators,
    reset,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    // State
    indicatorData: getAllIndicatorValues(),
    isInitializing,
    error,
    isInitialized: isInitializedRef.current,

    // Methods
    updateWithNewPrice,
    getIndicatorValue,
    reset,

    // Helper methods
    getIndicatorDisplayValue: (type: IndicatorType, period: number) => {
      const value = getIndicatorValue(type, period);
      if (value === null) return "N/A";

      // Format value based on indicator type
      switch (type) {
        case IndicatorType.RelativeStrengthIndex:
          return `${value.toFixed(2)}%`;
        case IndicatorType.SimpleMovingAverage:
        case IndicatorType.ExponentialMovingAverage:
          return `$${value.toFixed(2)}`;
        default:
          return value.toFixed(4);
      }
    },
  };
};

export default useStreamingIndicators;

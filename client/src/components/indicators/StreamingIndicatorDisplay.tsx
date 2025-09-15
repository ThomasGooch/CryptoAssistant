import React from "react";
import type { IndicatorConfig } from "../../types/domain";
import { IndicatorType } from "../../types/domain";
import { indicatorService } from "../../services/indicatorService";

interface StreamingIndicatorValue {
  type: IndicatorType;
  period: number;
  value: number | null;
  isInitialized: boolean;
}

interface StreamingIndicatorDisplayProps {
  symbol: string;
  indicators: { [key: string]: StreamingIndicatorValue };
  enabledIndicators: IndicatorConfig[];
  isInitializing: boolean;
  error: string | null;
  isLiveUpdating: boolean;
}

export const StreamingIndicatorDisplay: React.FC<
  StreamingIndicatorDisplayProps
> = ({
  symbol,
  indicators,
  enabledIndicators,
  isInitializing,
  error,
  isLiveUpdating,
}) => {
  const formatValue = (type: IndicatorType, value: number | null): string => {
    if (value === null) return "N/A";

    switch (type) {
      case IndicatorType.RelativeStrengthIndex:
        return `${value.toFixed(2)}%`;
      case IndicatorType.SimpleMovingAverage:
      case IndicatorType.ExponentialMovingAverage:
        return `$${value.toFixed(2)}`;
      case IndicatorType.BollingerBands:
        return `$${value.toFixed(2)}`;
      case IndicatorType.MACD:
        return value.toFixed(4);
      case IndicatorType.StochasticOscillator:
      case IndicatorType.WilliamsPercentR:
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(4);
    }
  };

  const getIndicatorColor = (
    type: IndicatorType,
    value: number | null,
  ): string => {
    if (value === null) return "text-gray-500";

    switch (type) {
      case IndicatorType.RelativeStrengthIndex:
        if (value >= 70) return "text-red-500"; // Overbought
        if (value <= 30) return "text-green-500"; // Oversold
        return "text-blue-500";
      case IndicatorType.StochasticOscillator:
        if (value >= 80) return "text-red-500"; // Overbought
        if (value <= 20) return "text-green-500"; // Oversold
        return "text-blue-500";
      case IndicatorType.WilliamsPercentR:
        if (value >= -20) return "text-red-500"; // Overbought
        if (value <= -80) return "text-green-500"; // Oversold
        return "text-blue-500";
      default:
        return "text-blue-500";
    }
  };

  const getSignalText = (
    type: IndicatorType,
    value: number | null,
  ): string | null => {
    if (value === null) return null;

    switch (type) {
      case IndicatorType.RelativeStrengthIndex:
        if (value >= 70) return "Overbought";
        if (value <= 30) return "Oversold";
        return "Neutral";
      case IndicatorType.StochasticOscillator:
        if (value >= 80) return "Overbought";
        if (value <= 20) return "Oversold";
        return "Neutral";
      case IndicatorType.WilliamsPercentR:
        if (value >= -20) return "Overbought";
        if (value <= -80) return "Oversold";
        return "Neutral";
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div
        role="alert"
        className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
      >
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-red-400 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-300">
            Error loading streaming indicators: {error}
          </p>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="p-4 text-center">
        <div className="inline-flex items-center">
          <svg
            data-testid="loading-spinner"
            className="animate-spin h-5 w-5 text-blue-500 mr-2"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Initializing streaming indicators...
          </span>
        </div>
      </div>
    );
  }

  const enabledIndicatorsList = enabledIndicators.filter((ind) => ind.enabled);

  if (enabledIndicatorsList.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        No indicators enabled for streaming calculations
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Live Technical Indicators
        </h3>
        {isLiveUpdating && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              STREAMING
            </span>
          </div>
        )}
      </div>

      {/* Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {enabledIndicatorsList.map((config) => {
          const key = `${config.type}_${config.period}`;
          const indicatorData = indicators[key];
          const displayName = indicatorService.getIndicatorDisplayName(
            config.type,
          );
          const value = indicatorData?.value || null;
          const isInitialized = indicatorData?.isInitialized || false;
          const color = getIndicatorColor(config.type, value);
          const signalText = getSignalText(config.type, value);

          return (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {displayName}
                </h4>
                {!isInitialized && (
                  <div
                    className="w-2 h-2 bg-yellow-500 rounded-full"
                    title="Initializing..."
                  />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Period: {config.period}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {symbol}
                  </span>
                </div>

                <div className={`text-xl font-bold ${color}`}>
                  {formatValue(config.type, value)}
                </div>

                {signalText && (
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded-full inline-block ${
                      signalText === "Overbought"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : signalText === "Oversold"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {signalText}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
        <div className="flex items-center justify-between">
          <span>
            {isLiveUpdating ? "Live streaming enabled" : "Historical data only"}
          </span>
          <span>
            {enabledIndicatorsList.length} indicator
            {enabledIndicatorsList.length !== 1 ? "s" : ""} active
          </span>
        </div>
      </div>
    </div>
  );
};

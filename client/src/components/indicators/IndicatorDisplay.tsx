import React from "react";
import { IndicatorType } from "../../types/domain";
import { indicatorService } from "../../services/indicatorService";

interface IndicatorDisplayProps {
  symbol: string;
  type: IndicatorType;
  value: number;
  period: number;
  startTime?: string;
  endTime?: string;
  isLoading?: boolean;
}

/**
 * Component for displaying technical indicator values
 */
const IndicatorDisplay: React.FC<IndicatorDisplayProps> = ({
  symbol,
  type,
  value,
  period,
  startTime,
  endTime,
  isLoading = false,
}) => {
  // Get the display name for the indicator
  const indicatorName = indicatorService.getIndicatorDisplayName(type);

  // Format the value based on indicator type
  const formatValue = () => {
    switch (type) {
      case IndicatorType.RelativeStrengthIndex:
      case IndicatorType.StochasticOscillator:
        // RSI and Stochastic are percentages
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  // Determine if the value is positive or negative (for styling)
  const isPositive = () => {
    switch (type) {
      case IndicatorType.RelativeStrengthIndex:
        return value > 50;
      case IndicatorType.StochasticOscillator:
        return value > 20;
      default:
        return true; // Default to positive for other indicators
    }
  };

  // Get value CSS class based on indicator type and value
  const getValueClass = () => {
    return isPositive()
      ? "indicator-value-positive"
      : "indicator-value-negative";
  };

  return (
    <div className="crypto-card">
      {isLoading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{indicatorName}</h3>
            <span className="text-sm text-gray-500">{symbol}</span>
          </div>
          <div className="mt-1">
            <span className="text-sm text-gray-500">Period: {period}</span>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-bold ${getValueClass()}`}>
              {formatValue()}
            </span>
          </div>
          {startTime && endTime && (
            <div className="mt-1 text-xs text-gray-500">
              {new Date(startTime).toLocaleDateString()} -{" "}
              {new Date(endTime).toLocaleDateString()}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IndicatorDisplay;

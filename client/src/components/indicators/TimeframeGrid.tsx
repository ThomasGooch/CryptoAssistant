import React from "react";
import type {
  TimeframeIndicatorResult,
  TimeframeAlignmentResponse,
} from "../../types/domain";
import { IndicatorType, Timeframe } from "../../types/domain";
import { multiTimeframeService } from "../../services/multiTimeframeService";

interface TimeframeGridProps {
  results: Record<Timeframe, TimeframeIndicatorResult>;
  indicatorType: IndicatorType;
  alignment: TimeframeAlignmentResponse;
}

/**
 * Component for displaying indicator values across multiple timeframes in a grid
 */
const TimeframeGrid: React.FC<TimeframeGridProps> = ({
  results,
  indicatorType,
  alignment,
}) => {
  // Sort timeframes by duration (shortest to longest)
  const sortedTimeframes = Object.keys(results)
    .map((tf) => parseInt(tf) as Timeframe)
    .sort((a, b) => {
      const order = [
        Timeframe.Minute,
        Timeframe.FiveMinutes,
        Timeframe.FifteenMinutes,
        Timeframe.Hour,
        Timeframe.FourHours,
        Timeframe.Day,
        Timeframe.Week,
      ];
      return order.indexOf(a) - order.indexOf(b);
    });

  const formatValue = (value: number) => {
    switch (indicatorType) {
      case IndicatorType.RelativeStrengthIndex:
      case IndicatorType.StochasticOscillator:
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  const getValueColorClass = (timeframe: Timeframe, value: number) => {
    // Highlight strongest and weakest timeframes
    if (alignment?.strongestTimeframe === timeframe) {
      return "bg-green-50 border-green-200 text-green-800";
    }
    if (alignment?.weakestTimeframe === timeframe) {
      return "bg-red-50 border-red-200 text-red-800";
    }

    // Default color based on indicator type
    switch (indicatorType) {
      case IndicatorType.RelativeStrengthIndex:
        if (value >= 70) return "bg-red-50 border-red-200 text-red-700";
        if (value <= 30) return "bg-green-50 border-green-200 text-green-700";
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      case IndicatorType.StochasticOscillator:
        if (value >= 80) return "bg-red-50 border-red-200 text-red-700";
        if (value <= 20) return "bg-green-50 border-green-200 text-green-700";
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      default:
        return "bg-blue-50 border-blue-200 text-blue-700";
    }
  };

  const getTimeframeLabel = (timeframe: Timeframe) => {
    const isStrongest = alignment?.strongestTimeframe === timeframe;
    const isWeakest = alignment?.weakestTimeframe === timeframe;

    let label = multiTimeframeService.getTimeframeDisplayName(timeframe);

    if (isStrongest) {
      label += " 💪";
    } else if (isWeakest) {
      label += " 📉";
    }

    return label;
  };

  return (
    <div className="crypto-card">
      <h3 className="text-lg font-semibold mb-4">Timeframe Breakdown</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedTimeframes.map((timeframe) => {
          const result = results[timeframe];

          // Skip if result is undefined or doesn't have required properties
          if (!result || typeof result.value !== "number") {
            return null;
          }

          const colorClass = getValueColorClass(timeframe, result.value);

          return (
            <div
              key={timeframe}
              className={`p-4 border-2 rounded-lg transition-all hover:shadow-md ${colorClass}`}
            >
              <div className="text-center">
                <div className="text-sm font-medium mb-2">
                  {getTimeframeLabel(timeframe)}
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatValue(result.value)}
                </div>
                <div className="text-xs text-gray-600">
                  {result.endTime
                    ? new Date(result.endTime).toLocaleTimeString()
                    : "N/A"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
            <span>Strongest Timeframe 💪</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
            <span>Weakest Timeframe 📉</span>
          </div>
          {(indicatorType === IndicatorType.RelativeStrengthIndex ||
            indicatorType === IndicatorType.StochasticOscillator) && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span>Neutral Zone</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeframeGrid;

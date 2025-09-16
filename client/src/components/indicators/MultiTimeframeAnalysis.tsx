import React, { useState, useEffect, useCallback } from "react";
import type { MultiTimeframeIndicatorResponse } from "../../types/domain";
import { IndicatorType, Timeframe } from "../../types/domain";
import type { MultiTimeframeAnalysisRequest } from "../../services/multiTimeframeService";
import { multiTimeframeService, createDateRange } from "../../services/multiTimeframeService";
import { indicatorService } from "../../services/indicatorService";
import TimeframeGrid from "./TimeframeGrid";
import AlignmentSummary from "./AlignmentSummary";
import TimeframeSelector from "./TimeframeSelector";
import DateRangeSelector from "./DateRangeSelector";

interface MultiTimeframeAnalysisProps {
  symbol: string;
  indicatorType: IndicatorType;
  period: number;
  defaultTimeframes?: Timeframe[];
}

/**
 * Component for displaying multi-timeframe indicator analysis
 */
const MultiTimeframeAnalysis: React.FC<MultiTimeframeAnalysisProps> = ({
  symbol,
  indicatorType,
  period,
  defaultTimeframes = [Timeframe.FiveMinutes, Timeframe.Hour, Timeframe.Day],
}) => {
  const [data, setData] = useState<MultiTimeframeIndicatorResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframes, setSelectedTimeframes] =
    useState<Timeframe[]>(defaultTimeframes);
  const [selectedDateRange, setSelectedDateRange] = useState<string>("30d");
  const [dateRangeDays, setDateRangeDays] = useState<number>(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const dateRange = createDateRange(dateRangeDays);
      
      const request: MultiTimeframeAnalysisRequest = {
        symbol,
        timeframes: selectedTimeframes,
        indicatorType,
        period,
        startTime: dateRange.startTime,
        endTime: dateRange.endTime,
      };

      const response =
        await multiTimeframeService.getMultiTimeframeAnalysis(request);
      setData(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load multi-timeframe analysis",
      );
      console.error("Multi-timeframe analysis error:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, selectedTimeframes, indicatorType, period, dateRangeDays]);

  // Load data when component mounts or parameters change
  useEffect(() => {
    if (symbol && selectedTimeframes.length > 0) {
      loadData();
    }
  }, [symbol, selectedTimeframes, indicatorType, period, dateRangeDays, loadData]);

  const handleTimeframeChange = (timeframes: Timeframe[]) => {
    setSelectedTimeframes(timeframes);
  };

  const handleDateRangeChange = (range: string, days: number) => {
    setSelectedDateRange(range);
    setDateRangeDays(days);
  };

  const indicatorName = indicatorService.getIndicatorDisplayName(indicatorType);

  if (loading) {
    return (
      <div className="crypto-card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crypto-card">
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="crypto-card">
        <div className="text-gray-500 text-center py-8">
          <p>No data available</p>
          <button
            onClick={loadData}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Load Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="crypto-card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Multi-Timeframe Analysis</h2>
            <p className="text-gray-600">
              {indicatorName} ({period}) - {symbol}
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="mb-4">
          <DateRangeSelector
            selectedRange={selectedDateRange}
            onChange={handleDateRangeChange}
            disabled={loading}
          />
        </div>

        {/* Timeframe Selector */}
        <TimeframeSelector
          selectedTimeframes={selectedTimeframes}
          onChange={handleTimeframeChange}
          disabled={loading}
        />
      </div>

      {/* Alignment Summary */}
      <AlignmentSummary alignment={data.alignment} />

      {/* Timeframe Grid */}
      <TimeframeGrid
        results={data.results}
        indicatorType={indicatorType}
        alignment={data.alignment}
      />

      {/* Data Info */}
      <div className="crypto-card">
        <h3 className="text-lg font-semibold mb-2">Data Range</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div>
            <span className="font-medium">Range:</span>{" "}
            {dateRangeDays} days ({selectedDateRange})
          </div>
          <div>
            <span className="font-medium">Start:</span>{" "}
            {new Date(data.startTime).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">End:</span>{" "}
            {new Date(data.endTime).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiTimeframeAnalysis;

import { useEffect, useState } from "react";
import PriceDisplay from "../components/crypto/PriceDisplay";
import { PriceChart } from "../components/crypto/PriceChart";
import { EnhancedPriceChart } from "../components/crypto/EnhancedPriceChart";
import { CandlestickChart } from "../components/crypto/CandlestickChart";
import { IndicatorPanel } from "../components/indicators/IndicatorPanel";
import IndicatorDisplay from "../components/indicators/IndicatorDisplay";
import ConnectionStatus from "../components/ConnectionStatus";
import { cryptoService } from "../services/cryptoService";
import { indicatorService } from "../services/indicatorService";
import { useSignalR } from "../hooks/useSignalR";
import {
  IndicatorType,
  Timeframe,
  ChartType,
  type IndicatorConfig,
} from "../types/domain";

// Helper function to get optimal periods based on timeframe
const getOptimalPeriods = (timeframe: Timeframe) => {
  switch (timeframe) {
    case Timeframe.Minute:
      return { sma: 20, ema: 12, rsi: 14 }; // 20 min, 12 min
    case Timeframe.FiveMinutes:
      return { sma: 15, ema: 8, rsi: 14 }; // 75 min, 40 min
    case Timeframe.FifteenMinutes:
      return { sma: 12, ema: 6, rsi: 14 }; // 3 hours, 1.5 hours
    case Timeframe.Hour:
      return { sma: 5, ema: 3, rsi: 14 }; // 5 hours, 3 hours
    case Timeframe.FourHours:
      return { sma: 12, ema: 6, rsi: 14 }; // 2 days, 1 day
    case Timeframe.Day:
      return { sma: 20, ema: 10, rsi: 14 }; // 20 days, 10 days
    case Timeframe.Week:
      return { sma: 12, ema: 6, rsi: 14 }; // 12 weeks, 6 weeks
    default:
      return { sma: 20, ema: 12, rsi: 14 };
  }
};

export function EnhancedCryptoAnalysis() {
  // State for cryptocurrency data
  const [symbol, setSymbol] = useState("BTC");
  const [price, setPrice] = useState(0);
  const [timestamp, setTimestamp] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  // State for chart configuration
  const [chartType, setChartType] = useState(ChartType.Line);
  const [timeframe, setTimeframe] = useState(Timeframe.Hour);
  const [showVolume, setShowVolume] = useState(false);
  const [useEnhancedChart, setUseEnhancedChart] = useState(true);

  // State for indicators with dynamic defaults
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    const periods = getOptimalPeriods(Timeframe.Hour);
    return [
      {
        type: IndicatorType.SimpleMovingAverage,
        period: periods.sma,
        color: "rgba(255, 165, 0, 1)",
        enabled: true,
      },
      {
        type: IndicatorType.ExponentialMovingAverage,
        period: periods.ema,
        color: "rgba(255, 99, 132, 1)",
        enabled: true,
      },
    ];
  });
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  // State for legacy indicator display
  const [indicatorType, setIndicatorType] = useState(
    IndicatorType.SimpleMovingAverage,
  );
  const [indicatorValue, setIndicatorValue] = useState(0);
  const [period, setPeriod] = useState(14);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isLoadingIndicator, setIsLoadingIndicator] = useState(true);
  const [availableIndicators, setAvailableIndicators] = useState<
    IndicatorType[]
  >([]);

  // State for real-time updates
  const [hasInitialData, setHasInitialData] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "error" | "disconnected"
  >("disconnected");

  // Get SignalR hook
  const {
    isConnected,
    error: signalRError,
    subscribeToPriceUpdates,
    subscribeToIndicatorUpdates,
  } = useSignalR();

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus("connected");
      return;
    }

    if (!isConnected && signalRError) {
      setConnectionStatus("error");
      return;
    }

    setConnectionStatus("disconnected");
  }, [isConnected, signalRError]);

  // Update indicator periods when timeframe changes
  useEffect(() => {
    const periods = getOptimalPeriods(timeframe);
    setIndicators((currentIndicators) =>
      currentIndicators.map((indicator) => {
        switch (indicator.type) {
          case IndicatorType.SimpleMovingAverage:
            return { ...indicator, period: periods.sma };
          case IndicatorType.ExponentialMovingAverage:
            return { ...indicator, period: periods.ema };
          case IndicatorType.RelativeStrengthIndex:
            return { ...indicator, period: periods.rsi };
          default:
            return indicator;
        }
      }),
    );
  }, [timeframe]);

  // Load initial price data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoadingPrice(true);
        const response = await cryptoService.getCurrentPrice(symbol);
        setPrice(response.price);
        setTimestamp(response.timestamp.toLocaleString());
        setHasInitialData(true);
      } catch (error) {
        console.error("Error loading initial price:", error);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    loadInitialData();
  }, [symbol]);

  // Load available indicators
  useEffect(() => {
    const loadIndicators = async () => {
      try {
        setIsLoadingIndicator(true);
        const response = await indicatorService.getAvailableIndicators();
        setAvailableIndicators(response.indicators);
      } catch (error) {
        console.error("Error loading indicators:", error);
      } finally {
        setIsLoadingIndicator(false);
      }
    };

    loadIndicators();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isConnected || !hasInitialData) return;

    const priceCallback = (newPrice: number) => {
      setPrice(newPrice);
      setTimestamp(new Date().toLocaleString());
    };

    const indicatorCallback = (value: number) => {
      setIndicatorValue(value);
      setStartTime(new Date().toLocaleString());
      setEndTime(new Date().toLocaleString());
    };

    subscribeToPriceUpdates(symbol, priceCallback);
    subscribeToIndicatorUpdates(
      symbol,
      indicatorType,
      period,
      indicatorCallback,
    );
  }, [
    isConnected,
    hasInitialData,
    symbol,
    indicatorType,
    period,
    subscribeToPriceUpdates,
    subscribeToIndicatorUpdates,
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Price & Chart */}
        <div className="xl:col-span-2 space-y-6">
          {/* Price Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Current Price</h2>
            <div className="mb-6">
              <label
                htmlFor="symbol"
                className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
              >
                Symbol
              </label>
              <input
                id="symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter symbol (e.g., BTC)"
              />
            </div>
            <PriceDisplay
              symbol={symbol}
              price={price}
              timestamp={timestamp}
              isLoading={isLoadingPrice}
            />
          </div>

          {/* Chart Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Price Analysis</h2>

              {/* Chart Mode Toggle */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={useEnhancedChart}
                    onChange={(e) => setUseEnhancedChart(e.target.checked)}
                    className="mr-2"
                  />
                  Enhanced Mode
                </label>
              </div>
            </div>

            {/* Chart Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label
                  htmlFor="chartType"
                  className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
                >
                  Chart Type
                </label>
                <select
                  id="chartType"
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value={ChartType.Line}>Line Chart</option>
                  <option value={ChartType.Candlestick}>
                    Candlestick Chart
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="timeframe"
                  className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
                >
                  Timeframe
                </label>
                <select
                  id="timeframe"
                  value={timeframe}
                  onChange={(e) =>
                    setTimeframe(Number(e.target.value) as Timeframe)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value={Timeframe.Minute}>1 Minute</option>
                  <option value={Timeframe.FiveMinutes}>5 Minutes</option>
                  <option value={Timeframe.FifteenMinutes}>15 Minutes</option>
                  <option value={Timeframe.Hour}>1 Hour</option>
                  <option value={Timeframe.FourHours}>4 Hours</option>
                  <option value={Timeframe.Day}>1 Day</option>
                  <option value={Timeframe.Week}>1 Week</option>
                </select>
              </div>

              {chartType === ChartType.Candlestick && (
                <div>
                  <label
                    htmlFor="showVolume"
                    className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
                  >
                    Show Volume
                  </label>
                  <div className="flex items-center pt-2">
                    <input
                      id="showVolume"
                      type="checkbox"
                      checked={showVolume}
                      onChange={(e) => setShowVolume(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Display volume bars</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart Display */}
            <div className="h-96">
              {useEnhancedChart && chartType === ChartType.Line ? (
                <EnhancedPriceChart
                  symbol={symbol}
                  timeframe={timeframe}
                  indicators={indicators}
                  showRSI={showRSI}
                  showMACD={showMACD}
                  interactive={true}
                />
              ) : chartType === ChartType.Candlestick ? (
                <CandlestickChart
                  symbol={symbol}
                  timeframe={timeframe}
                  showVolume={showVolume}
                />
              ) : (
                <PriceChart symbol={symbol} timeframe={timeframe} />
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Indicators */}
        <div className="space-y-6">
          {/* Enhanced Indicators Panel */}
          {useEnhancedChart && chartType === ChartType.Line && (
            <IndicatorPanel
              indicators={indicators}
              onIndicatorsChange={setIndicators}
              showRSI={showRSI}
              showMACD={showMACD}
              onShowRSIChange={setShowRSI}
              onShowMACDChange={setShowMACD}
            />
          )}

          {/* Legacy Indicators Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Technical Indicators</h2>
            <div className="mb-6">
              <label
                htmlFor="indicator"
                className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
              >
                Indicator Type
              </label>
              <select
                id="indicator"
                value={indicatorType}
                onChange={(e) =>
                  setIndicatorType(Number(e.target.value) as IndicatorType)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {availableIndicators.map((type) => (
                  <option key={type} value={type}>
                    {indicatorService.getIndicatorDisplayName(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label
                htmlFor="period"
                className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2"
              >
                Period
              </label>
              <input
                id="period"
                type="number"
                value={period}
                onChange={(e) =>
                  setPeriod(Math.max(1, parseInt(e.target.value)))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                min="1"
                max="200"
              />
            </div>
            <IndicatorDisplay
              symbol={symbol}
              type={indicatorType}
              value={indicatorValue}
              period={period}
              startTime={startTime}
              endTime={endTime}
              isLoading={isLoadingIndicator}
            />
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
              📊 Enhanced Mode Features
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>
                • <strong>Overlay Indicators:</strong> SMA, EMA, Bollinger Bands
                on the main chart
              </li>
              <li>
                • <strong>RSI:</strong> Separate axis (0-100 range) for
                oscillator visualization
              </li>
              <li>
                • <strong>MACD:</strong> Separate axis with MACD line, signal
                line, and histogram
              </li>
              <li>
                • <strong>Multiple Indicators:</strong> Add multiple overlays
                simultaneously
              </li>
              <li>
                • <strong>Interactive:</strong> Hover for detailed indicator
                values
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <ConnectionStatus status={connectionStatus} />
    </div>
  );
}

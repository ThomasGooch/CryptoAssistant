import { useEffect, useState } from "react";
import PriceDisplay from "../components/crypto/PriceDisplay";
import { LivePriceChart } from "../components/crypto/LivePriceChart";
import { LivePriceToggle } from "../components/crypto/LivePriceToggle";
import { CandlestickChart } from "../components/crypto/CandlestickChart";
import IndicatorDisplay from "../components/indicators/IndicatorDisplay";
import { StreamingIndicatorDisplay } from "../components/indicators/StreamingIndicatorDisplay";
import MultiTimeframeAnalysis from "../components/indicators/MultiTimeframeAnalysis";
import ConnectionStatus from "../components/ConnectionStatus";
import { cryptoService } from "../services/cryptoService";
import { indicatorService } from "../services/indicatorService";
import { useSignalR } from "../hooks/useSignalR";
import { useCoinbaseWebSocket } from "../hooks/useCoinbaseWebSocket";
import { useStreamingIndicators } from "../hooks/useStreamingIndicators";
import type { IndicatorConfig } from "../types/domain";
import { IndicatorType, Timeframe, ChartType } from "../types/domain";

export function LiveCryptoAnalysis() {
  // State for cryptocurrency data
  const [symbol, setSymbol] = useState("BTC");
  const [price, setPrice] = useState(0);
  const [timestamp, setTimestamp] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  // State for chart configuration
  const [chartType, setChartType] = useState(ChartType.Line);
  const [timeframe, setTimeframe] = useState(Timeframe.Hour);
  const [showVolume, setShowVolume] = useState(false);
  const [enableLiveUpdates, setEnableLiveUpdates] = useState(true);

  // State for indicator data
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

  // State for streaming indicators
  const [streamingIndicatorConfigs] = useState<IndicatorConfig[]>([
    {
      type: IndicatorType.SimpleMovingAverage,
      period: 20,
      color: "#3b82f6",
      enabled: true,
    },
    {
      type: IndicatorType.RelativeStrengthIndex,
      period: 14,
      color: "#8b5cf6",
      enabled: true,
    },
    {
      type: IndicatorType.ExponentialMovingAverage,
      period: 12,
      color: "#10b981",
      enabled: true,
    },
  ]);

  // State for real-time updates
  const [hasInitialData, setHasInitialData] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "error" | "disconnected"
  >("disconnected");

  // Get SignalR hook for backend real-time connection
  const {
    isConnected,
    error: signalRError,
    subscribeToPriceUpdates,
    subscribeToIndicatorUpdates,
  } = useSignalR();

  // Get streaming indicators hook
  const {
    indicatorData: streamingIndicatorData,
    isInitializing: isInitializingIndicators,
    error: streamingIndicatorError,
    updateWithNewPrice,
    isInitialized: indicatorsInitialized,
  } = useStreamingIndicators({
    symbol: enableLiveUpdates ? symbol : undefined,
    indicators: streamingIndicatorConfigs,
    timeframe,
    enableLiveUpdates,
  });

  // Get WebSocket hook for Coinbase direct connection
  const { isConnected: wsConnected, error: wsError } = useCoinbaseWebSocket({
    symbol: enableLiveUpdates ? symbol : undefined,
    autoConnect: enableLiveUpdates,
    onPriceUpdate: (livePrice) => {
      // Update price from WebSocket
      setPrice(livePrice.price);
      setTimestamp(
        typeof livePrice.timestamp === "string"
          ? new Date(livePrice.timestamp).toLocaleString()
          : livePrice.timestamp.toLocaleString(),
      );

      // Update streaming indicators with new price
      if (enableLiveUpdates && indicatorsInitialized) {
        updateWithNewPrice(livePrice);
      }
    },
  });

  // Update connection status based on both connections
  useEffect(() => {
    console.log("LiveCryptoAnalysis: Connection status update", {
      isConnected,
      wsConnected,
      enableLiveUpdates,
      signalRError,
      wsError,
    });

    // If live updates are enabled and WebSocket is connected, prioritize that
    if (enableLiveUpdates && wsConnected) {
      setConnectionStatus("connected");
      return;
    }

    // Fall back to SignalR connection
    if (isConnected) {
      setConnectionStatus("connected");
      return;
    }

    // Show error if there are connection errors
    if (signalRError || (enableLiveUpdates && wsError)) {
      setConnectionStatus("error");
      return;
    }

    // Otherwise disconnected
    setConnectionStatus("disconnected");
  }, [isConnected, wsConnected, enableLiveUpdates, signalRError, wsError]);

  // Load initial price data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoadingPrice(true);
        const response = await cryptoService.getCurrentPrice(symbol);

        // Only update if we don't have live WebSocket data
        if (!enableLiveUpdates || !wsConnected) {
          setPrice(response.price);
          setTimestamp(response.timestamp.toLocaleString());
        }

        setHasInitialData(true);
      } catch (error) {
        console.error("Error loading initial price:", error);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    loadInitialData();
  }, [symbol, enableLiveUpdates, wsConnected]);

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

  // Subscribe to SignalR real-time updates (when not using WebSocket)
  useEffect(() => {
    if (!isConnected || !hasInitialData || enableLiveUpdates) return;

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
    enableLiveUpdates,
    symbol,
    indicatorType,
    period,
    subscribeToPriceUpdates,
    subscribeToIndicatorUpdates,
  ]);

  const handleLiveToggle = (enabled: boolean) => {
    setEnableLiveUpdates(enabled);
    console.log("Live updates toggled:", enabled);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Price Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Current Price</h2>
              <LivePriceToggle
                enabled={enableLiveUpdates}
                onToggle={handleLiveToggle}
                isConnected={wsConnected}
              />
            </div>

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

            {/* Live price status indicator */}
            {enableLiveUpdates && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      wsConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {wsConnected
                      ? "Live Data Active"
                      : "Connecting to live feed..."}
                  </span>
                </div>
                {wsError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    WebSocket Error: {wsError}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">
              Price History {enableLiveUpdates && wsConnected ? "(Live)" : ""}
            </h2>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <div className="flex items-center">
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
              {chartType === ChartType.Candlestick ? (
                <CandlestickChart
                  symbol={symbol}
                  timeframe={timeframe}
                  showVolume={showVolume}
                />
              ) : (
                <LivePriceChart
                  symbol={symbol}
                  timeframe={timeframe}
                  enableLiveUpdates={enableLiveUpdates}
                />
              )}
            </div>
          </div>
        </div>

        {/* Indicators Section */}
        <div className="space-y-6">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Streaming Indicators Display */}
            {enableLiveUpdates && (
              <div className="mt-6">
                <StreamingIndicatorDisplay
                  symbol={symbol}
                  indicators={streamingIndicatorData}
                  enabledIndicators={streamingIndicatorConfigs}
                  isInitializing={isInitializingIndicators}
                  error={streamingIndicatorError}
                  isLiveUpdating={wsConnected && indicatorsInitialized}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Timeframe Analysis Section */}
      <div className="mb-8">
        <MultiTimeframeAnalysis
          symbol={symbol}
          indicatorType={indicatorType}
          period={period}
          defaultTimeframes={[
            Timeframe.FiveMinutes,
            Timeframe.Hour,
            Timeframe.Day,
          ]}
        />
      </div>

      {/* Connection Status */}
      <ConnectionStatus
        status={connectionStatus}
        additionalInfo={
          enableLiveUpdates ? (
            <div className="text-xs mt-1">
              WebSocket: {wsConnected ? "Connected" : "Disconnected"}
              {wsError && ` (${wsError})`}
            </div>
          ) : undefined
        }
      />
    </div>
  );
}

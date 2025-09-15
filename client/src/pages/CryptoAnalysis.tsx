import { useEffect, useState } from "react";
import PriceDisplay from "../components/crypto/PriceDisplay";
import { PriceChart } from "../components/crypto/PriceChart";
import { CandlestickChart } from "../components/crypto/CandlestickChart";
import IndicatorDisplay from "../components/indicators/IndicatorDisplay";
import ConnectionStatus from "../components/ConnectionStatus";
import { cryptoService } from "../services/cryptoService";
import { indicatorService } from "../services/indicatorService";
import { useSignalR } from "../hooks/useSignalR";
import { IndicatorType, Timeframe, ChartType } from "../types/domain";

export function CryptoAnalysis() {
  // State for cryptocurrency data
  const [symbol, setSymbol] = useState("BTC");
  const [price, setPrice] = useState(0);
  const [timestamp, setTimestamp] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  // State for chart configuration
  const [chartType, setChartType] = useState(ChartType.Line);
  const [timeframe, setTimeframe] = useState(Timeframe.Hour);
  const [showVolume, setShowVolume] = useState(false);

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
    console.log("CryptoAnalysis: useEffect triggered with", {
      isConnected,
      signalRError,
    });
    console.log(
      "CryptoAnalysis: connectionStatus before update",
      connectionStatus,
    );

    // When connected, always show connected state
    if (isConnected) {
      console.log("CryptoAnalysis: Setting connectionStatus to connected");
      setConnectionStatus("connected");
      return;
    }

    // When disconnected with an error, show error state
    if (!isConnected && signalRError) {
      console.log("CryptoAnalysis: Setting connectionStatus to error");
      setConnectionStatus("error");
      return;
    }

    // Otherwise, show disconnected state
    console.log("CryptoAnalysis: Setting connectionStatus to disconnected");
    setConnectionStatus("disconnected");
  }, [isConnected, signalRError, connectionStatus]);

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

  // Connection status is handled by the ConnectionStatus component

  console.log("CryptoAnalysis: Render with", {
    isConnected,
    signalRError,
    connectionStatus,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Price Section */}
        <div className="space-y-6">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Price History</h2>

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
                <PriceChart symbol={symbol} timeframe={timeframe} />
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
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <ConnectionStatus status={connectionStatus} />
    </div>
  );
}

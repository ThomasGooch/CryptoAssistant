import { useState, useEffect } from "react";
import { CandlestickChart } from "../components/crypto/CandlestickChart";
import { ElliottWaveAlertManager } from "../components/alerts/ElliottWaveAlertManager";
import PriceDisplay from "../components/crypto/PriceDisplay";
import { cryptoService } from "../services/cryptoService";
import { elliottWaveService } from "../services/elliottWaveService";
import { useSignalR } from "../hooks/useSignalR";
import { useCoinbaseWebSocket } from "../hooks/useCoinbaseWebSocket";
import ConnectionStatus from "../components/ConnectionStatus";
import { Timeframe } from "../types/domain";
import type { ElliottWavePattern, ElliottWaveAlert } from "../types/domain";

export function ElliottWaveAnalysis() {
  // State for cryptocurrency data
  const [symbol, setSymbol] = useState("BTC");
  const [price, setPrice] = useState(0);
  const [timestamp, setTimestamp] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  // State for Elliott Wave configuration
  const [timeframe, setTimeframe] = useState(Timeframe.Hour);
  const [showElliottWaves, setShowElliottWaves] = useState(true);
  const [showWaveLabels, setShowWaveLabels] = useState(true);
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [showVolume] = useState(false);

  // State for Elliott Wave analysis
  const [currentPatterns, setCurrentPatterns] = useState<ElliottWavePattern[]>([]);
  const [patternAnalysisLoading, setPatternAnalysisLoading] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<ElliottWaveAlert[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // State for real-time updates
  const [enableLiveUpdates, setEnableLiveUpdates] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "error" | "disconnected"
  >("disconnected");

  // Available symbols
  const cryptoSymbols = [
    { value: "BTC", label: "Bitcoin (BTC-USD)" },
    { value: "ETH", label: "Ethereum (ETH-USD)" },
    { value: "ADA", label: "Cardano (ADA-USD)" },
    { value: "SOL", label: "Solana (SOL-USD)" },
    { value: "DOT", label: "Polkadot (DOT-USD)" },
    { value: "MATIC", label: "Polygon (MATIC-USD)" },
    { value: "LINK", label: "Chainlink (LINK-USD)" },
    { value: "UNI", label: "Uniswap (UNI-USD)" },
  ];

  // Available timeframes
  const timeframeOptions = [
    { value: Timeframe.FifteenMinutes, label: "15 Minutes" },
    { value: Timeframe.Hour, label: "1 Hour" },
    { value: Timeframe.FourHours, label: "4 Hours" },
    { value: Timeframe.Day, label: "1 Day" },
    { value: Timeframe.Week, label: "1 Week" },
  ];

  // Get SignalR hook for backend real-time connection
  const {
    isConnected: signalRConnected,
    error: signalRError,
    subscribeToPriceUpdates,
  } = useSignalR();

  // Get WebSocket hook for Coinbase direct connection
  const { isConnected: wsConnected, error: wsError } = useCoinbaseWebSocket({
    symbol: enableLiveUpdates ? symbol : undefined,
    autoConnect: enableLiveUpdates,
    onPriceUpdate: (livePrice) => {
      if (enableLiveUpdates) {
        setPrice(livePrice.price);
        setTimestamp(livePrice.timestamp.toString());
        setIsLoadingPrice(false);
        
        // Trigger pattern re-analysis with new price
        analyzePatterns();
      }
    },
  });

  // Fetch initial price data
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setIsLoadingPrice(true);
        const priceData = await cryptoService.getCurrentPrice(symbol);
        setPrice(priceData.price);
        setTimestamp(priceData.timestamp.toString());
      } catch (error) {
        console.error("Error fetching price:", error);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchPrice();
  }, [symbol]);

  // Subscribe to SignalR price updates
  useEffect(() => {
    if (signalRConnected && enableLiveUpdates) {
      subscribeToPriceUpdates(symbol, (price: number) => {
        setPrice(price);
        setTimestamp(new Date().toISOString());
        setIsLoadingPrice(false);
      });
    }
  }, [signalRConnected, enableLiveUpdates, symbol, subscribeToPriceUpdates]);

  // Update connection status
  useEffect(() => {
    if (wsConnected || signalRConnected) {
      setConnectionStatus("connected");
    } else if (wsError || signalRError) {
      setConnectionStatus("error");
    } else {
      setConnectionStatus("disconnected");
    }
  }, [wsConnected, signalRConnected, wsError, signalRError]);

  // Analyze Elliott Wave patterns
  const analyzePatterns = async () => {
    if (!symbol || patternAnalysisLoading) return;

    try {
      setPatternAnalysisLoading(true);
      setAnalysisError(null);

      // Get candlestick data for analysis
      const response = await cryptoService.getHistoricalCandlestickData(
        symbol,
        timeframe
      );

      if (response.data.length === 0) {
        setAnalysisError("No market data available for analysis");
        return;
      }

      // Detect Elliott Wave patterns
      const impulsePatterns = elliottWaveService.detectImpulseWaves(response.data);
      const correctivePatterns = elliottWaveService.detectCorrectiveWaves(response.data);
      const allPatterns = [...impulsePatterns, ...correctivePatterns];

      setCurrentPatterns(allPatterns);

      if (allPatterns.length === 0) {
        setAnalysisError("No Elliott Wave patterns detected in current market data");
      }

    } catch (error) {
      console.error("Pattern analysis failed:", error);
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setPatternAnalysisLoading(false);
    }
  };

  // Trigger pattern analysis when symbol or timeframe changes
  useEffect(() => {
    analyzePatterns();
  }, [symbol, timeframe]);

  // Handle alerts generated
  const handleAlertsGenerated = (alerts: ElliottWaveAlert[]) => {
    if (alerts.length > 0) {
      setRecentAlerts(prev => [...alerts, ...prev].slice(0, 10)); // Keep last 10 alerts
    }
  };

  const getPatternSummary = () => {
    const impulseCount = currentPatterns.filter(p => p.type === "impulse").length;
    const correctiveCount = currentPatterns.filter(p => p.type !== "impulse").length;
    const avgConfidence = currentPatterns.length > 0 
      ? (currentPatterns.reduce((sum, p) => sum + p.confidence, 0) / currentPatterns.length * 100).toFixed(1)
      : "0";

    return { impulseCount, correctiveCount, avgConfidence };
  };

  const patternSummary = getPatternSummary();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Elliott Wave Analysis</h1>
            <p className="text-purple-100 text-lg">
              Advanced pattern recognition with Fibonacci retracements and automated alerts
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75">Live Market Data</div>
            <ConnectionStatus 
              status={connectionStatus}
            />
          </div>
        </div>

        {/* Pattern Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{patternSummary.impulseCount}</div>
            <div className="text-sm opacity-90">Impulse Patterns</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{patternSummary.correctiveCount}</div>
            <div className="text-sm opacity-90">Corrective Patterns</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{patternSummary.avgConfidence}%</div>
            <div className="text-sm opacity-90">Avg Confidence</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{recentAlerts.length}</div>
            <div className="text-sm opacity-90">Recent Alerts</div>
          </div>
        </div>
      </div>

      {/* Recent Alerts Banner */}
      {recentAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">🚨 Latest Elliott Wave Alert</h3>
              <div className="text-sm opacity-90 mt-1">
                {recentAlerts[0].message}
              </div>
              <div className="text-xs opacity-75 mt-1">
                {new Date(recentAlerts[0].createdAt).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setRecentAlerts([])}
              className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-1 rounded text-sm"
            >
              Dismiss All
            </button>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Analysis Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Symbol Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cryptocurrency
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., BTC)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Popular: BTC, ETH, ADA, SOL, DOT, MATIC, LINK, UNI
            </div>
          </div>

          {/* Timeframe Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(parseInt(e.target.value) as Timeframe)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Display Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Display Options
            </label>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showElliottWaves}
                  onChange={(e) => setShowElliottWaves(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                Elliott Waves
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showWaveLabels}
                  onChange={(e) => setShowWaveLabels(e.target.checked)}
                  disabled={!showElliottWaves}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                Wave Labels
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showFibonacci}
                  onChange={(e) => setShowFibonacci(e.target.checked)}
                  disabled={!showElliottWaves}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                Fibonacci Levels
              </label>
            </div>
          </div>

          {/* Live Updates */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Real-time Updates
            </label>
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableLiveUpdates}
                  onChange={(e) => setEnableLiveUpdates(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm text-gray-700">
                  {enableLiveUpdates ? 'On' : 'Off'}
                </span>
              </label>
            </div>
            <button
              onClick={analyzePatterns}
              disabled={patternAnalysisLoading}
              className="mt-2 w-full px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {patternAnalysisLoading ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
          </div>
        </div>

        {/* Analysis Error Display */}
        {analysisError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <div className="text-sm text-yellow-700">{analysisError}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {symbol}-USD Price Chart with Elliott Wave Analysis
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {timeframeOptions.find(t => t.value === timeframe)?.label} timeframe
                </p>
              </div>
              <div>
                <PriceDisplay
                  symbol={symbol}
                  price={price}
                  timestamp={timestamp}
                  isLoading={isLoadingPrice}
                />
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <CandlestickChart
              symbol={symbol}
              timeframe={timeframe}
              showVolume={showVolume}
              interactive={true}
              showElliottWaves={showElliottWaves}
              showWaveLabels={showWaveLabels}
              showFibonacci={showFibonacci}
            />
          </div>
        </div>

        {/* Alert Management Section - Takes 1 column */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Elliott Wave Alerts
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Automated pattern detection and monitoring
            </p>
          </div>
          
          <div className="flex-1 min-h-0">
            <ElliottWaveAlertManager
              symbol={symbol}
              timeframe={timeframe}
              onAlertsGenerated={handleAlertsGenerated}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import { CandlestickChart } from "../components/crypto/CandlestickChart";
import { TradingSuggestionCard } from "../components/trading/TradingSuggestionCard";
import { cryptoService } from "../services/cryptoService";
import { indicatorService } from "../services/indicatorService";
import { tradingSignalService } from "../services/tradingSignalService";
import { elliottWaveService } from "../services/elliottWaveService";
import { useSignalR } from "../hooks/useSignalR";
import { useCoinbaseWebSocket } from "../hooks/useCoinbaseWebSocket";
import { Timeframe, IndicatorType, ChartType } from "../types/domain";
import type { TradingSignal } from "../services/tradingSignalService";
import type { CandlestickData } from "../types/domain";

export function TradingDashboard() {
  // Core State
  const [symbol, setSymbol] = useState("BTC");
  const [timeframe, setTimeframe] = useState(Timeframe.Hour);
  const [price, setPrice] = useState(0);
  const [priceChange24h, setPriceChange24h] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Chart Configuration
  const [showElliottWaves, setShowElliottWaves] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>([
    IndicatorType.SimpleMovingAverage,
    IndicatorType.RelativeStrengthIndex
  ]);

  // Indicators Data
  const [rsiValue, setRsiValue] = useState(50);
  const [smaValue, setSmaValue] = useState(0);

  // Alerts & Signals
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [showTradingCard, setShowTradingCard] = useState(false);
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([]);

  // Available symbols for quick switching
  const popularSymbols = [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "ADA", name: "Cardano" },
    { symbol: "SOL", name: "Solana" },
    { symbol: "MATIC", name: "Polygon" },
    { symbol: "DOT", name: "Polkadot" }
  ];

  // Timeframe options
  const timeframeOptions = [
    { value: Timeframe.FifteenMinutes, label: "15M", short: "15m" },
    { value: Timeframe.Hour, label: "1H", short: "1h" },
    { value: Timeframe.FourHours, label: "4H", short: "4h" },
    { value: Timeframe.Day, label: "1D", short: "1d" },
    { value: Timeframe.Week, label: "1W", short: "1w" }
  ];

  // Available indicators
  const indicatorOptions = [
    { type: IndicatorType.SimpleMovingAverage, label: "SMA", color: "text-blue-600" },
    { type: IndicatorType.ExponentialMovingAverage, label: "EMA", color: "text-purple-600" },
    { type: IndicatorType.RelativeStrengthIndex, label: "RSI", color: "text-orange-600" },
    { type: IndicatorType.MACD, label: "MACD", color: "text-green-600" },
    { type: IndicatorType.BollingerBands, label: "BB", color: "text-red-600" }
  ];

  // Real-time connections
  const { isConnected: signalRConnected } = useSignalR();
  const { isConnected: wsConnected } = useCoinbaseWebSocket({
    symbol,
    autoConnect: true,
    onPriceUpdate: (livePrice) => {
      setPrice(livePrice.price);
      setIsLoading(false);
    },
  });

  // Load initial data and generate trading signals
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Load price data
        const priceData = await cryptoService.getCurrentPrice(symbol);
        setPrice(priceData.price);
        
        // Load candlestick data for Elliott Wave analysis
        const candlestickResponse = await cryptoService.getHistoricalCandlestickData(symbol, timeframe);
        setCandlestickData(candlestickResponse.data);
        
        // Load indicators
        if (activeIndicators.includes(IndicatorType.RelativeStrengthIndex)) {
          const rsiData = await indicatorService.getIndicator(symbol, IndicatorType.RelativeStrengthIndex, 14);
          setRsiValue(rsiData.value);
        }
        
        if (activeIndicators.includes(IndicatorType.SimpleMovingAverage)) {
          const smaData = await indicatorService.getIndicator(symbol, IndicatorType.SimpleMovingAverage, 20);
          setSmaValue(smaData.value);
        }

        // Generate Elliott Wave patterns and trading signals
        if (showElliottWaves && candlestickResponse.data.length > 0) {
          console.log('🚀 Auto-generating trading signals with data length:', candlestickResponse.data.length);
          generateTradingSignals(candlestickResponse.data);
        }

      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [symbol, activeIndicators, timeframe, showElliottWaves]);

  // Generate trading signals from Elliott Wave analysis
  const generateTradingSignals = async (data: CandlestickData[]) => {
    console.log('🎯 Generating trading signals with data points:', data.length);
    try {
      // Detect Elliott Wave patterns
      const impulsePatterns = elliottWaveService.detectImpulseWaves(data);
      const correctivePatterns = elliottWaveService.detectCorrectiveWaves(data);
      const allPatterns = [...impulsePatterns, ...correctivePatterns];
      
      console.log('📈 Elliott Wave patterns found:', {
        impulse: impulsePatterns.length,
        corrective: correctivePatterns.length,
        total: allPatterns.length
      });
      
      if (allPatterns.length > 0) {
        // Generate comprehensive trading signal
        const signal = tradingSignalService.generateTradingSignal(data, allPatterns, symbol);
        console.log('💡 Generated signal:', {
          type: signal?.signalType,
          strength: signal?.signalStrength,
          confidence: signal?.confidence
        });
        
        if (signal && (signal.signalStrength === 'STRONG' || signal.confidence > 0.7)) {
          console.log('✅ Showing STRONG signal card');
          setCurrentSignal(signal);
          setShowTradingCard(true);
        } else if (signal) {
          console.log('⚠️ Showing WEAK signal card');
          setCurrentSignal(signal);
          // Show weaker signals only if no strong signal exists
          if (!showTradingCard) {
            setShowTradingCard(true);
          }
        }
      } else {
        console.log('❌ No Elliott Wave patterns detected');
        // Force show a demo signal for testing
        console.log('🔧 Creating demo signal for testing...');
        const demoSignal = tradingSignalService.generateTradingSignal(data, [], symbol);
        if (demoSignal) {
          console.log('🎯 Showing demo signal');
          setCurrentSignal(demoSignal);
          setShowTradingCard(true);
        }
      }
    } catch (error) {
      console.error("Failed to generate trading signals:", error);
    }
  };

  // Toggle indicator
  const toggleIndicator = (indicator: IndicatorType) => {
    setActiveIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  // Format price with appropriate decimals
  const formatPrice = (price: number) => {
    if (price > 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price > 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  // Get price change color
  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  // Calculate RSI status
  const getRsiStatus = (rsi: number) => {
    if (rsi >= 70) return { label: "Overbought", color: "text-red-600 bg-red-100" };
    if (rsi <= 30) return { label: "Oversold", color: "text-green-600 bg-green-100" };
    return { label: "Neutral", color: "text-gray-600 bg-gray-100" };
  };

  const rsiStatus = getRsiStatus(rsiValue);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Symbol & Price */}
          <div className="flex items-center space-x-6">
            {/* Symbol Input */}
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Enter symbol (e.g., BTC)"
                className="text-xl font-bold bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 dark:text-white px-2 py-1 min-w-[80px]"
              />
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {popularSymbols.find(s => s.symbol === symbol)?.name || 'Custom Symbol'}
              </div>
            </div>

            {/* Live Price */}
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold dark:text-white">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-300 h-8 w-32 rounded"></div>
                ) : (
                  formatPrice(price)
                )}
              </div>
              
              {priceChange24h !== 0 && (
                <div className={`text-sm font-medium px-2 py-1 rounded ${getPriceChangeColor(priceChange24h)}`}>
                  {priceChange24h > 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                </div>
              )}

              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected || signalRConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {wsConnected || signalRConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side - Quick Stats */}
          <div className="flex items-center space-x-6">
            {/* RSI Indicator */}
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">RSI (14)</div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold dark:text-white">{rsiValue.toFixed(1)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${rsiStatus.color}`}>
                  {rsiStatus.label}
                </span>
              </div>
            </div>

            {/* SMA */}
            {activeIndicators.includes(IndicatorType.SimpleMovingAverage) && (
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">SMA (20)</div>
                <div className="text-sm font-bold dark:text-white">{formatPrice(smaValue)}</div>
              </div>
            )}

            {/* Generate Signal Button */}
            <button
              onClick={() => candlestickData.length > 0 && generateTradingSignals(candlestickData)}
              disabled={!candlestickData.length || isLoading}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📊 Signal
            </button>


            {/* Alerts Button */}
            <button
              onClick={() => setShowAlertsPanel(!showAlertsPanel)}
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              🔔
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="mt-4 flex items-center justify-between">
          {/* Timeframe Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {timeframeOptions.map(tf => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  timeframe === tf.value
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Feature Toggles */}
          <div className="flex items-center space-x-4">
            {/* Elliott Waves Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showElliottWaves}
                onChange={(e) => setShowElliottWaves(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Elliott Waves</span>
            </label>

            {/* Volume Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={(e) => setShowVolume(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Volume</span>
            </label>

            {/* Indicators */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Indicators:</span>
              {indicatorOptions.map(indicator => (
                <button
                  key={indicator.type}
                  onClick={() => toggleIndicator(indicator.type)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    activeIndicators.includes(indicator.type)
                      ? `${indicator.color} bg-white dark:bg-gray-700 shadow`
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {indicator.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <CandlestickChart
            symbol={symbol}
            timeframe={timeframe}
            showVolume={showVolume}
            interactive={true}
            showElliottWaves={showElliottWaves}
            showWaveLabels={showElliottWaves}
            showFibonacci={showElliottWaves}
            activeIndicators={activeIndicators}
          />
        </div>
      </div>

      {/* Alerts Panel (Sliding) */}
      {showAlertsPanel && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Alerts & Signals</h3>
              <button
                onClick={() => setShowAlertsPanel(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-4 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
            {/* Alert Creation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Create Price Alert</h4>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder={`Alert when ${symbol} reaches...`}
                  className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700 rounded text-sm dark:bg-gray-700 dark:text-white"
                />
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                  Set Price Alert
                </button>
              </div>
            </div>

            {/* RSI Alert */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">RSI Alerts</h4>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-orange-600 text-white py-2 px-3 rounded text-xs hover:bg-orange-700">
                  Alert RSI ≥ 70
                </button>
                <button className="bg-orange-600 text-white py-2 px-3 rounded text-xs hover:bg-orange-700">
                  Alert RSI ≤ 30
                </button>
              </div>
            </div>

            {/* Pattern Alerts */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">Pattern Alerts</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded text-purple-600" />
                  <span className="text-sm dark:text-gray-200">Elliott Wave Complete</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded text-purple-600" />
                  <span className="text-sm dark:text-gray-200">Fibonacci Breakout</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded text-purple-600" />
                  <span className="text-sm dark:text-gray-200">Strong Signal Generated</span>
                </label>
              </div>
            </div>

            {/* Active Alerts */}
            <div>
              <h4 className="text-sm font-semibold dark:text-white mb-2">Active Alerts ({alerts.length})</h4>
              {alerts.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No active alerts
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert, idx) => (
                    <div key={idx} className="bg-gray-100 dark:bg-gray-700 rounded p-3">
                      <div className="text-sm font-medium dark:text-white">{alert.type}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{alert.condition}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Trading Suggestion Card */}
      {showTradingCard && currentSignal && (
        <TradingSuggestionCard
          signal={currentSignal}
          currentPrice={price}
          onDismiss={() => setShowTradingCard(false)}
        />
      )}
    </div>
  );
}
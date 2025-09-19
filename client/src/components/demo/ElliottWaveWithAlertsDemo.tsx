import { useState } from "react";
import { CandlestickChart } from "../crypto/CandlestickChart";
import { ElliottWaveAlertManager } from "../alerts/ElliottWaveAlertManager";
import { Timeframe } from "../../types/domain";
import type { ElliottWaveAlert } from "../../types/domain";

export const ElliottWaveWithAlertsDemo: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC-USD");
  const [selectedTimeframe, setSelectedTimeframe] = useState(Timeframe.Hour);
  const [showElliottWaves, setShowElliottWaves] = useState(true);
  const [showWaveLabels, setShowWaveLabels] = useState(true);
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [recentAlerts, setRecentAlerts] = useState<ElliottWaveAlert[]>([]);

  const cryptoSymbols = [
    "BTC-USD", "ETH-USD", "ADA-USD", "SOL-USD", "DOT-USD"
  ];

  const timeframeOptions = [
    { value: Timeframe.FifteenMinutes, label: "15m" },
    { value: Timeframe.Hour, label: "1h" },
    { value: Timeframe.FourHours, label: "4h" },
    { value: Timeframe.Day, label: "1d" },
  ];

  const handleAlertsGenerated = (alerts: ElliottWaveAlert[]) => {
    if (alerts.length > 0) {
      setRecentAlerts(prev => [...alerts, ...prev].slice(0, 5)); // Keep last 5 recent alerts
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Elliott Wave Pattern Recognition & Alert System
          </h1>
          <p className="text-lg text-gray-600 max-w-4xl">
            Advanced technical analysis combining Elliott Wave pattern detection, Fibonacci retracements, 
            and automated alert system. Monitor cryptocurrency markets for key pattern formations and 
            price level approaches in real-time.
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trading Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Symbol Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Symbol
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {cryptoSymbols.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            {/* Timeframe Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeframe
              </label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(parseInt(e.target.value) as Timeframe)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeframeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Elliott Wave Controls */}
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showElliottWaves}
                  onChange={(e) => setShowElliottWaves(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium">Elliott Waves</span>
              </label>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showWaveLabels}
                  onChange={(e) => setShowWaveLabels(e.target.checked)}
                  disabled={!showElliottWaves}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium">Wave Labels</span>
              </label>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFibonacci}
                  onChange={(e) => setShowFibonacci(e.target.checked)}
                  disabled={!showElliottWaves}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium">Fibonacci</span>
              </label>
            </div>

            {/* Recent Alerts Indicator */}
            <div className="flex items-center justify-center">
              {recentAlerts.length > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-600">
                    {recentAlerts.length} New Alert{recentAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Alerts Banner */}
        {recentAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">🚨 Latest Elliott Wave Alerts</h3>
                <div className="text-sm opacity-90 mt-1">
                  {recentAlerts[0].message}
                </div>
              </div>
              <button
                onClick={() => setRecentAlerts([])}
                className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-1 rounded text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedSymbol} Price Chart
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {timeframeOptions.find(t => t.value === selectedTimeframe)?.label} timeframe with Elliott Wave analysis
              </p>
            </div>
            
            <div className="p-6">
              <CandlestickChart
                symbol={selectedSymbol}
                timeframe={selectedTimeframe}
                showVolume={false}
                interactive={true}
                showElliottWaves={showElliottWaves}
                showWaveLabels={showWaveLabels}
                showFibonacci={showFibonacci}
              />
            </div>
          </div>

          {/* Alert Management Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Alert Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure and monitor Elliott Wave pattern alerts
              </p>
            </div>
            
            <div className="h-96 overflow-auto">
              <ElliottWaveAlertManager
                symbol={selectedSymbol}
                timeframe={selectedTimeframe}
                onAlertsGenerated={handleAlertsGenerated}
              />
            </div>
          </div>
        </div>

        {/* Educational Content */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3">🌊 Elliott Wave Patterns</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• <strong>Impulse (1-2-3-4-5):</strong> Main trend direction</li>
              <li>• <strong>Corrective (A-B-C):</strong> Counter-trend moves</li>
              <li>• <strong>Wave Rules:</strong> Validated automatically</li>
              <li>• <strong>Confidence Scoring:</strong> Reliability assessment</li>
            </ul>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-3">📊 Fibonacci Levels</h3>
            <ul className="text-sm text-green-700 space-y-2">
              <li>• <strong>23.6%, 38.2%, 50%:</strong> Key retracement levels</li>
              <li>• <strong>61.8%, 78.6%:</strong> Deep retracement zones</li>
              <li>• <strong>Extensions:</strong> Target projection levels</li>
              <li>• <strong>Price Alerts:</strong> Approach notifications</li>
            </ul>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-3">🚨 Smart Alerts</h3>
            <ul className="text-sm text-purple-700 space-y-2">
              <li>• <strong>Pattern Detection:</strong> New formations</li>
              <li>• <strong>Fibonacci Alerts:</strong> Level approaches</li>
              <li>• <strong>Wave Targets:</strong> Completion signals</li>
              <li>• <strong>Cooldown System:</strong> Prevents spam</li>
            </ul>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 How to Use This System</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold mb-2">Chart Analysis:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Select your preferred crypto symbol and timeframe</li>
                <li>Enable Elliott Wave overlay to see pattern detection</li>
                <li>Wave labels (1-2-3-4-5, A-B-C) show at key turning points</li>
                <li>Fibonacci levels appear as horizontal support/resistance lines</li>
                <li>Hover over chart for detailed pattern information</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Alert Configuration:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Set minimum confidence threshold for pattern alerts</li>
                <li>Choose which Fibonacci levels to monitor</li>
                <li>Configure cooldown periods to control alert frequency</li>
                <li>Monitor active alerts in real-time</li>
                <li>Review alert history and pattern analysis</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
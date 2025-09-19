import { useState, useEffect } from "react";
import { elliottWaveAlertService } from "../../services/elliottWaveAlertService";
import { cryptoService } from "../../services/cryptoService";
import type { ElliottWaveAlert } from "../../types/domain";
import { AlertSeverity, AlertStatus, Timeframe } from "../../types/domain";

interface ElliottWaveAlertManagerProps {
  symbol: string;
  timeframe: Timeframe;
  onAlertsGenerated?: (alerts: ElliottWaveAlert[]) => void;
}

export const ElliottWaveAlertManager: React.FC<ElliottWaveAlertManagerProps> = ({
  symbol,
  timeframe,
  onAlertsGenerated
}) => {
  const [alerts, setAlerts] = useState<ElliottWaveAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState({
    enabled: true,
    minimumConfidence: 0.7,
    fibonacciLevelsToWatch: [0.382, 0.5, 0.618],
    cooldownMinutes: 30,
  });
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Only analyze on historical timeframes (4H, 1D, 1W)
  const allowedTimeframes = [Timeframe.FourHours, Timeframe.Day, Timeframe.Week];

  // Historical analysis only for specific timeframes
  useEffect(() => {
    if (!symbol || !config.enabled) return;

    if (!allowedTimeframes.includes(timeframe)) {
      setAlerts([]);
      setError("Elliott Wave analysis is only available for 4H, 1D, and 1W timeframes");
      return;
    }

    const analyzeHistoricalPatterns = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`🌊 Starting Elliott Wave historical analysis for ${symbol} on ${timeframe} timeframe`);

        // Get historical candlestick data (more data for better pattern recognition)
        const response = await cryptoService.getHistoricalCandlestickData(symbol, timeframe);
        const candlestickData = response.data;

        if (candlestickData.length === 0) {
          setError("No historical data available for analysis");
          return;
        }

        console.log(`🌊 Loaded ${candlestickData.length} historical data points`);

        // For historical analysis, use a point in the past as "current price"
        // This simulates analyzing completed patterns rather than real-time
        const analysisPoint = Math.max(0, candlestickData.length - Math.floor(candlestickData.length * 0.1));
        const historicalPrice = candlestickData[analysisPoint].close;
        const historicalData = candlestickData.slice(0, analysisPoint + 1);

        console.log(`🌊 Analyzing up to data point ${analysisPoint} (${Math.round((analysisPoint / candlestickData.length) * 100)}% of data)`);

        // Analyze for Elliott Wave patterns in historical data
        const newAlerts = await elliottWaveAlertService.analyzeAndAlert(
          symbol,
          historicalData,
          historicalPrice,
          {
            ...config,
            // Adjust config for historical analysis
            cooldownMinutes: 0, // No cooldown for historical analysis
            minimumConfidence: Math.max(0.6, config.minimumConfidence), // Higher confidence for historical patterns
          }
        );

        console.log(`🌊 Found ${newAlerts.length} historical Elliott Wave patterns`);

        setAlerts(prev => {
          // For historical analysis, replace rather than merge
          const filtered = newAlerts.filter(alert => 
            alert.minimumConfidence >= config.minimumConfidence
          );
          return filtered.slice(-50); // Keep last 50 alerts
        });

        setLastAnalysis(new Date());
        onAlertsGenerated?.(newAlerts);

      } catch (err) {
        console.error("🌊 Elliott Wave historical analysis failed:", err);
        setError(err instanceof Error ? err.message : "Historical analysis failed");
      } finally {
        setLoading(false);
      }
    };

    // Only run analysis when configuration changes or symbol/timeframe changes
    // No periodic updates for historical analysis
    analyzeHistoricalPatterns();
  }, [symbol, timeframe, config.enabled, config.minimumConfidence, onAlertsGenerated]);

  const handleConfigChange = (newConfig: Partial<typeof config>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const clearAlerts = () => {
    setAlerts([]);
    elliottWaveAlertService.clearHistory();
  };

  const getActivePatterns = () => {
    return elliottWaveAlertService.getActivePatterns(symbol);
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.Critical: return "text-red-600 bg-red-100";
      case AlertSeverity.Warning: return "text-yellow-600 bg-yellow-100";
      case AlertSeverity.Info: return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Elliott Wave Alerts
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Historical pattern analysis for 4H, 1D, and 1W timeframes
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {loading && (
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              )}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                {config.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {config.enabled ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Confidence
              </label>
              <select
                value={config.minimumConfidence}
                onChange={(e) => handleConfigChange({ minimumConfidence: parseFloat(e.target.value) })}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-xs"
              >
                <option value={0.5}>5</option>
                <option value={0.6}>6</option>
                <option value={0.7}>7</option>
                <option value={0.8}>8</option>
                <option value={0.9}>9</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Analysis Mode
              </label>
              <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                Historical Only
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  4H, 1D, 1W timeframes
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Actions
              </label>
              <button
                onClick={clearAlerts}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Clear History
              </button>
            </div>
          </div>

          {/* Fibonacci Levels Configuration - More Compact */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Watch Fibonacci Levels
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0.236, 0.382, 0.5, 0.618, 0.786].map(level => (
                <label key={level} className="flex items-center justify-center p-2 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={config.fibonacciLevelsToWatch.includes(level)}
                    onChange={(e) => {
                      const levels = e.target.checked
                        ? [...config.fibonacciLevelsToWatch, level]
                        : config.fibonacciLevelsToWatch.filter(l => l !== level);
                      handleConfigChange({ fibonacciLevelsToWatch: levels });
                    }}
                    className="sr-only"
                  />
                  <span className={`text-xs font-medium ${config.fibonacciLevelsToWatch.includes(level) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {(level * 100).toFixed(1)}%
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="flex flex-col items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Alerts:</span>
              <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{alerts.filter(a => a.status === AlertStatus.Active).length}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Alerts:</span>
              <span className="font-bold text-lg text-gray-700 dark:text-gray-300">{alerts.length}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-600 dark:text-gray-400">Last Analysis:</span>
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                {lastAnalysis ? lastAnalysis.toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Patterns:</span>
              <span className="font-bold text-lg text-purple-600 dark:text-purple-400">{getActivePatterns().length}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="text-red-600 dark:text-red-400 text-xs">
              <span className="font-medium">Error:</span> {error}
            </div>
          </div>
        )}

        {/* Alerts List - Flexible Height with Better UX */}
        <div className="flex-1 min-h-0">
          {alerts.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
              <div className="text-sm font-medium mb-1">No Elliott Wave patterns found</div>
              <div className="text-xs">
                {config.enabled 
                  ? allowedTimeframes.includes(timeframe)
                    ? "No historical patterns detected in this timeframe"
                    : "Switch to 4H, 1D, or 1W timeframe for Elliott Wave analysis"
                  : "Enable analysis to detect historical Elliott Wave patterns"}
              </div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-track-gray-700 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500">
              {alerts.slice().reverse().map((alert) => (
                <div key={alert.id} className={`p-3 rounded-md border-l-3 text-xs ${
                  alert.severity === AlertSeverity.Critical ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                  alert.severity === AlertSeverity.Warning ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                  'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-sm font-medium ${getSeverityColor(alert.severity)}`}>
                          {AlertSeverity[alert.severity]}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                          {alert.alertType.replace('_', ' ').toUpperCase()}
                        </span>
                        {alert.patternType && (
                          <span className="text-xs px-1.5 py-0.5 rounded-sm bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                            {alert.patternType.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1 leading-tight">
                        {alert.message}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-x-3 leading-tight">
                        <span>{formatTimestamp(alert.createdAt).split(',')[1]?.trim() || formatTimestamp(alert.createdAt)}</span>
                        {alert.targetPrice && (
                          <span>${alert.targetPrice.toFixed(2)}</span>
                        )}
                        {alert.fibonacciLevel && (
                          <span>{(alert.fibonacciLevel * 100).toFixed(1)}%</span>
                        )}
                        <span>{(alert.minimumConfidence * 100).toFixed(0)}%+</span>
                      </div>
                    </div>
                    <div className={`text-xs px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap ${
                      alert.status === AlertStatus.Active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      alert.status === AlertStatus.Triggered ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {AlertStatus[alert.status]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
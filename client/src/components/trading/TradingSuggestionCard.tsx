import { useState } from "react";
import type { TradingSignal } from "../../services/tradingSignalService";

interface TradingSuggestionCardProps {
  signal: TradingSignal;
  currentPrice: number;
  onDismiss?: () => void;
}

export const TradingSuggestionCard: React.FC<TradingSuggestionCardProps> = ({
  signal,
  currentPrice,
  onDismiss
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSignalStyle = () => {
    switch (signal.signalType) {
      case 'BUY':
        return {
          gradient: 'from-emerald-500 to-green-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          accent: 'text-emerald-600',
          icon: '📈'
        };
      case 'SELL':
        return {
          gradient: 'from-red-500 to-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          accent: 'text-red-600',
          icon: '📉'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          accent: 'text-gray-600',
          icon: '⚖️'
        };
    }
  };

  const style = getSignalStyle();
  
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatPercentage = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  
  const priceDistance = (targetPrice: number) => {
    const distance = ((targetPrice - currentPrice) / currentPrice) * 100;
    return formatPercentage(distance);
  };

  return (
    <div className={`fixed bottom-6 right-6 w-96 ${style.bg} border-2 ${style.border} rounded-xl shadow-2xl z-50 overflow-hidden`}>
      {/* Header with Gradient */}
      <div className={`bg-gradient-to-r ${style.gradient} text-white p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{style.icon}</div>
            <div>
              <h3 className="text-lg font-bold">Trading Suggestion</h3>
              <div className="text-sm opacity-90">{signal.symbol} • {new Date(signal.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
              {signal.signalType}
            </div>
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="text-white/70 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Signal Overview */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Signal Strength</span>
            <span className={`text-sm font-bold ${style.accent}`}>{signal.signalStrength}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Confidence Level</span>
            <span className={`text-sm font-bold ${style.accent}`}>{(signal.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Risk/Reward Ratio</span>
            <span className={`text-sm font-bold ${style.accent}`}>{signal.riskRewardRatio.toFixed(2)}:1</span>
          </div>
        </div>

        {/* Action Plan */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center">
            🎯 Action Plan
          </h4>
          
          {/* Entry Strategy */}
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-semibold text-blue-800">💼 Macro Entry</div>
                  <div className="text-xs text-blue-600">{signal.macroEntry.timeframe} timeframe</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-800">{formatPrice(signal.macroEntry.level)}</div>
                  <div className="text-xs text-blue-600">{priceDistance(signal.macroEntry.level)}</div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-semibold text-purple-800">🎯 Micro Entry</div>
                  <div className="text-xs text-purple-600">Precision timing</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-purple-800">{formatPrice(signal.microEntry.level)}</div>
                  <div className="text-xs text-purple-600">{priceDistance(signal.microEntry.level)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-xs font-medium text-red-600 mb-1">🛑 Stop Loss</div>
              <div className="text-sm font-bold text-red-800">{formatPrice(signal.stopLoss.level)}</div>
              <div className="text-xs text-red-600">-{signal.stopLoss.percentage.toFixed(1)}%</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xs font-medium text-green-600 mb-1">🎯 Take Profit</div>
              <div className="text-sm font-bold text-green-800">{formatPrice(signal.takeProfit.primary)}</div>
              <div className="text-xs text-green-600">+{signal.takeProfit.percentage.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="bg-indigo-50 rounded-lg p-3 mb-4">
          <h5 className="text-sm font-bold text-indigo-800 mb-2">📋 Quick Summary</h5>
          <div className="space-y-1 text-xs text-indigo-700">
            <div>• <strong>Current Price:</strong> {formatPrice(currentPrice)}</div>
            <div>• <strong>Entry Range:</strong> {formatPrice(signal.microEntry.level)} - {formatPrice(signal.macroEntry.level)}</div>
            <div>• <strong>Target:</strong> {formatPrice(signal.takeProfit.primary)} ({formatPercentage(signal.takeProfit.percentage)})</div>
            <div>• <strong>Max Risk:</strong> {formatPrice(signal.stopLoss.level)} (-{signal.stopLoss.percentage.toFixed(1)}%)</div>
            <div>• <strong>Hold Time:</strong> {signal.timeAnalysis.recommendedHoldTime}</div>
          </div>
        </div>

        {/* Expand/Collapse for Details */}
        <div className="border-t pt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            <span>{isExpanded ? '↗️ Hide' : '📊 View'} Technical Details</span>
            <span>{isExpanded ? '▼' : '▶'}</span>
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-3 text-xs">
              {/* Market Context */}
              <div className="bg-gray-50 rounded p-3">
                <div className="font-semibold text-gray-700 mb-2">📈 Market Context</div>
                <div className="space-y-1 text-gray-600">
                  <div>• <strong>Trend:</strong> {signal.technicalFactors.trendAlignment}</div>
                  <div>• <strong>Volatility:</strong> {signal.timeAnalysis.volatilityWindow}</div>
                  <div>• <strong>Session:</strong> {signal.timeAnalysis.marketSession}</div>
                  <div>• <strong>Wave Position:</strong> {signal.macroEntry.wavePosition}</div>
                </div>
              </div>

              {/* Wait For Confirmations */}
              <div className="bg-yellow-50 rounded p-3">
                <div className="font-semibold text-yellow-800 mb-2">⚠️ Wait for These Confirmations</div>
                <div className="space-y-1">
                  {signal.microEntry.confirmationRequired.map((confirmation, idx) => (
                    <div key={idx} className="flex items-center text-yellow-700">
                      <span className="w-1 h-1 bg-yellow-600 rounded-full mr-2"></span>
                      {confirmation}
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Factors */}
              <div className="bg-blue-50 rounded p-3">
                <div className="font-semibold text-blue-800 mb-2">🔍 Technical Analysis</div>
                <div className="grid grid-cols-2 gap-2 text-blue-700">
                  <div>Volume: {signal.technicalFactors.volumeConfirmation ? '✅' : '❌'}</div>
                  <div>Fibonacci: {signal.technicalFactors.fibonacciAlignment ? '✅' : '❌'}</div>
                  <div>Momentum: {signal.technicalFactors.momentumDivergence ? '⚠️' : '✅'}</div>
                  <div>Pattern: {(signal.technicalFactors.waveCountValidity * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Expected Moves */}
              <div className="bg-green-50 rounded p-3">
                <div className="font-semibold text-green-800 mb-2">📊 Expected Price Moves</div>
                <div className="space-y-1 text-green-700">
                  <div>• <strong>Bullish Target:</strong> {formatPrice(signal.expectedMove.bullishTarget)}</div>
                  <div>• <strong>Bearish Target:</strong> {formatPrice(signal.expectedMove.bearishTarget)}</div>
                  <div>• <strong>Neutral Zone:</strong> {formatPrice(signal.expectedMove.neutralZone[0])} - {formatPrice(signal.expectedMove.neutralZone[1])}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button className={`flex-1 bg-gradient-to-r ${style.gradient} text-white py-2 px-4 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity`}>
            Set Alert at {formatPrice(signal.microEntry.level)}
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300">
            Share
          </button>
        </div>
      </div>
    </div>
  );
};
import { useState } from "react";
import { IndicatorType, type IndicatorConfig } from "../../types/domain";
import { indicatorService } from "../../services/indicatorService";

interface IndicatorPanelProps {
  indicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  showRSI: boolean;
  showMACD: boolean;
  onShowRSIChange: (show: boolean) => void;
  onShowMACDChange: (show: boolean) => void;
}

const DEFAULT_COLORS = [
  "rgba(255, 99, 132, 1)", // Red
  "rgba(54, 162, 235, 1)", // Blue
  "rgba(255, 206, 86, 1)", // Yellow
  "rgba(75, 192, 192, 1)", // Teal
  "rgba(153, 102, 255, 1)", // Purple
  "rgba(255, 159, 64, 1)", // Orange
];

export const IndicatorPanel: React.FC<IndicatorPanelProps> = ({
  indicators,
  onIndicatorsChange,
  showRSI,
  showMACD,
  onShowRSIChange,
  onShowMACDChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const addIndicator = (type: IndicatorType) => {
    const newIndicator: IndicatorConfig = {
      type,
      period: getDefaultPeriod(type),
      color: DEFAULT_COLORS[indicators.length % DEFAULT_COLORS.length],
      enabled: true,
      parameters: getDefaultParameters(type),
    };

    onIndicatorsChange([...indicators, newIndicator]);
  };

  const updateIndicator = (
    index: number,
    updates: Partial<IndicatorConfig>,
  ) => {
    const newIndicators = [...indicators];
    newIndicators[index] = { ...newIndicators[index], ...updates };
    onIndicatorsChange(newIndicators);
  };

  const removeIndicator = (index: number) => {
    const newIndicators = indicators.filter((_, i) => i !== index);
    onIndicatorsChange(newIndicators);
  };

  const getDefaultPeriod = (type: IndicatorType): number => {
    switch (type) {
      case IndicatorType.SimpleMovingAverage:
      case IndicatorType.ExponentialMovingAverage:
        return 20;
      case IndicatorType.RelativeStrengthIndex:
        return 14;
      case IndicatorType.BollingerBands:
        return 20;
      case IndicatorType.StochasticOscillator:
        return 14;
      case IndicatorType.MACD:
        return 12; // Fast period
      case IndicatorType.WilliamsPercentR:
        return 14;
      default:
        return 14;
    }
  };

  const getDefaultParameters = (
    type: IndicatorType,
  ): Record<string, unknown> => {
    switch (type) {
      case IndicatorType.MACD:
        return {
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
        };
      case IndicatorType.BollingerBands:
        return {
          standardDeviations: 2,
        };
      default:
        return {};
    }
  };

  const getAvailableIndicatorTypes = (): IndicatorType[] => {
    return [
      IndicatorType.SimpleMovingAverage,
      IndicatorType.ExponentialMovingAverage,
      IndicatorType.BollingerBands,
      // RSI and MACD are handled separately as they need separate Y axes
    ];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Technical Indicators</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Quick toggles for separate axis indicators */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <label className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <input
            type="checkbox"
            checked={showRSI}
            onChange={(e) => onShowRSIChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium">RSI (0-100)</span>
        </label>

        <label className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <input
            type="checkbox"
            checked={showMACD}
            onChange={(e) => onShowMACDChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium">MACD</span>
        </label>
      </div>

      {isExpanded && (
        <>
          {/* Add New Indicator */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Add Overlay Indicator:
            </h4>
            <div className="flex flex-wrap gap-2">
              {getAvailableIndicatorTypes().map((type) => (
                <button
                  key={type}
                  onClick={() => addIndicator(type)}
                  className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  + {indicatorService.getIndicatorDisplayName(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Current Indicators */}
          {indicators.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Overlay Indicators:
              </h4>

              {indicators.map((indicator, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={indicator.enabled}
                          onChange={(e) =>
                            updateIndicator(index, {
                              enabled: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        <span className="ml-2 font-medium">
                          {indicatorService.getIndicatorDisplayName(
                            indicator.type,
                          )}
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={() => removeIndicator(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Remove indicator"
                    >
                      ×
                    </button>
                  </div>

                  {indicator.enabled && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Period */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Period
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={indicator.period}
                          onChange={(e) =>
                            updateIndicator(index, {
                              period: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Color */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Color
                        </label>
                        <div className="flex space-x-1">
                          <input
                            type="color"
                            value={indicator.color
                              .replace("rgba(", "#")
                              .replace(/,.*/, "")
                              .replace(")", "")}
                            onChange={(e) => {
                              const hex = e.target.value;
                              const r = parseInt(hex.slice(1, 3), 16);
                              const g = parseInt(hex.slice(3, 5), 16);
                              const b = parseInt(hex.slice(5, 7), 16);
                              updateIndicator(index, {
                                color: `rgba(${r}, ${g}, ${b}, 1)`,
                              });
                            }}
                            className="w-8 h-6 rounded border border-gray-300"
                          />
                          <select
                            value={indicator.color}
                            onChange={(e) =>
                              updateIndicator(index, { color: e.target.value })
                            }
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          >
                            {DEFAULT_COLORS.map((color, i) => (
                              <option key={i} value={color}>
                                Color {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Additional Parameters for specific indicators */}
                      {indicator.type === IndicatorType.BollingerBands && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Std Dev
                          </label>
                          <input
                            type="number"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={
                              indicator.parameters?.standardDeviations?.toString() ||
                              "2"
                            }
                            onChange={(e) =>
                              updateIndicator(index, {
                                parameters: {
                                  ...indicator.parameters,
                                  standardDeviations:
                                    parseFloat(e.target.value) || 2,
                                },
                              })
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Tip:</strong> Overlay indicators (SMA, EMA, Bollinger
              Bands) are displayed on the main price chart. RSI and MACD use
              separate Y-axes for better visualization.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

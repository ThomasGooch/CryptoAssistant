import { useState } from "react";
import { usePreferences } from "../../contexts/PreferencesContext";
import { ChartType, IndicatorType } from "../../types/domain";
import type {
  ChartPreferences,
  UIPreferences,
  IndicatorPreference,
} from "../../types/domain";

interface PreferencesSettingsProps {
  onClose?: () => void;
}

export function PreferencesSettings({ onClose }: PreferencesSettingsProps) {
  const { state, actions } = usePreferences();
  const [activeTab, setActiveTab] = useState<
    "chart" | "indicators" | "favorites" | "ui"
  >("chart");

  if (!state.preferences) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {state.isLoading
            ? "Loading preferences..."
            : "No preferences available"}
        </div>
      </div>
    );
  }

  const handleChartPreferencesUpdate = async (
    updates: Partial<ChartPreferences>,
  ) => {
    const updated = { ...state.preferences!.chart, ...updates };
    await actions.updateChartPreferences(updated);
  };

  const handleUIPreferencesUpdate = async (updates: Partial<UIPreferences>) => {
    const updated = { ...state.preferences!.ui, ...updates };
    await actions.updateUIPreferences(updated);
  };

  const handleIndicatorToggle = async (indicatorType: IndicatorType) => {
    const existing = state.preferences!.indicators.find(
      (i) => i.type === indicatorType,
    );

    if (existing) {
      // Toggle visibility
      const updated = state.preferences!.indicators.map((i) =>
        i.type === indicatorType ? { ...i, isVisible: !i.isVisible } : i,
      );
      await actions.updateIndicators(updated);
    } else {
      // Add new indicator with defaults
      const newIndicator: IndicatorPreference = {
        type: indicatorType,
        period: 14,
        isVisible: true,
        color: "#007bff",
        parameters: {},
      };
      await actions.updateIndicators([
        ...state.preferences!.indicators,
        newIndicator,
      ]);
    }
  };

  const handleAddFavoritePair = async (pair: string) => {
    if (pair && !state.preferences!.favoritePairs.includes(pair)) {
      await actions.addFavoritePair(pair);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          User Preferences
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      {/* Error message */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded">
          {state.error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          {[
            { id: "chart", name: "Chart Settings", icon: "📈" },
            { id: "indicators", name: "Indicators", icon: "📊" },
            { id: "favorites", name: "Favorite Pairs", icon: "⭐" },
            { id: "ui", name: "UI Settings", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as "chart" | "indicators" | "favorites" | "ui",
                )
              }
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Chart Settings */}
        {activeTab === "chart" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chart Type
              </label>
              <select
                value={state.preferences.chart.type}
                onChange={(e) =>
                  handleChartPreferencesUpdate({
                    type: e.target.value as ChartType,
                  })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={ChartType.Line}>Line Chart</option>
                <option value={ChartType.Candlestick}>Candlestick Chart</option>
                <option value={ChartType.Bar}>Bar Chart</option>
                <option value={ChartType.Area}>Area Chart</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Time Frame
              </label>
              <select
                value={state.preferences.chart.timeFrame}
                onChange={(e) =>
                  handleChartPreferencesUpdate({ timeFrame: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
                <option value="1w">1 Week</option>
              </select>
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={state.preferences.chart.showVolume}
                  onChange={(e) =>
                    handleChartPreferencesUpdate({
                      showVolume: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show Volume</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={state.preferences.chart.showGrid}
                  onChange={(e) =>
                    handleChartPreferencesUpdate({ showGrid: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show Grid</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Scheme
              </label>
              <select
                value={state.preferences.chart.colorScheme}
                onChange={(e) =>
                  handleChartPreferencesUpdate({ colorScheme: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="default">Default</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="colorful">Colorful</option>
              </select>
            </div>
          </div>
        )}

        {/* Indicators */}
        {activeTab === "indicators" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Available Indicators
            </h3>
            {Object.values(IndicatorType)
              .filter((value) => typeof value === "number")
              .map((type) => {
                const indicator = state.preferences!.indicators.find(
                  (i) => i.type === type,
                );
                const indicatorNames = {
                  [IndicatorType.SimpleMovingAverage]:
                    "Simple Moving Average (SMA)",
                  [IndicatorType.ExponentialMovingAverage]:
                    "Exponential Moving Average (EMA)",
                  [IndicatorType.RelativeStrengthIndex]:
                    "Relative Strength Index (RSI)",
                  [IndicatorType.BollingerBands]: "Bollinger Bands",
                  [IndicatorType.StochasticOscillator]: "Stochastic Oscillator",
                  [IndicatorType.MACD]: "MACD",
                  [IndicatorType.WilliamsPercentR]: "Williams %R",
                };

                return (
                  <div
                    key={type}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-gray-800">
                        {indicatorNames[type as IndicatorType]}
                      </span>
                      {indicator && (
                        <div className="text-sm text-gray-600">
                          Period: {indicator.period} | Color:
                          <span
                            className="inline-block w-4 h-4 rounded ml-1 border"
                            style={{ backgroundColor: indicator.color }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleIndicatorToggle(type as IndicatorType)
                      }
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        indicator?.isVisible
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : indicator
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                    >
                      {indicator?.isVisible
                        ? "Visible"
                        : indicator
                          ? "Hidden"
                          : "Add"}
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        {/* Favorite Pairs */}
        {activeTab === "favorites" && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Add trading pair (e.g., BTC-USD)"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.target as HTMLInputElement;
                    handleAddFavoritePair(input.value.toUpperCase());
                    input.value = "";
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {state.preferences.favoritePairs.map((pair) => (
                <div
                  key={pair}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-800">{pair}</span>
                  <button
                    onClick={() => actions.removeFavoritePair(pair)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Remove ${pair}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UI Settings */}
        {activeTab === "ui" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Dark Mode
                </label>
                <p className="text-sm text-gray-500">Enable dark theme</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.preferences.ui.darkMode}
                  onChange={(e) =>
                    handleUIPreferencesUpdate({ darkMode: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={state.preferences.ui.language}
                onChange={(e) =>
                  handleUIPreferencesUpdate({ language: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Show Advanced Features
                </label>
                <p className="text-sm text-gray-500">
                  Enable advanced trading features
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.preferences.ui.showAdvancedFeatures}
                  onChange={(e) =>
                    handleUIPreferencesUpdate({
                      showAdvancedFeatures: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refresh Interval (seconds)
              </label>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={state.preferences.ui.refreshInterval / 1000}
                onChange={(e) =>
                  handleUIPreferencesUpdate({
                    refreshInterval: parseInt(e.target.value) * 1000,
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1s</span>
                <span>{state.preferences.ui.refreshInterval / 1000}s</span>
                <span>60s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 flex justify-between items-center">
        <button
          onClick={actions.resetToDefaults}
          disabled={state.isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
        >
          Reset to Defaults
        </button>

        <div className="text-sm text-gray-500">
          Last updated:{" "}
          {new Date(state.preferences.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

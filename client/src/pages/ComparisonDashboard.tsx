import { useEffect, useState } from "react";
import { PriceChart } from "../components/crypto/PriceChart";
import { CandlestickChart } from "../components/crypto/CandlestickChart";
import { MultiSymbolSelector } from "../components/comparison/MultiSymbolSelector";
import { PortfolioSummary } from "../components/comparison/PortfolioSummary";
import { CorrelationMatrix } from "../components/comparison/CorrelationMatrix";
import { cryptoService } from "../services/cryptoService";
import { Timeframe, ChartType } from "../types/domain";

interface AssetData {
  symbol: string;
  price: number;
  timestamp: string;
  priceChange24h?: number;
  percentChange24h?: number;
}

export function ComparisonDashboard() {
  // Multi-asset state
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    "BTC",
    "ETH",
    "ADA",
  ]);
  const [assetData, setAssetData] = useState<Map<string, AssetData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Global chart configuration
  const [globalTimeframe, setGlobalTimeframe] = useState(Timeframe.Hour);
  const [globalChartType, setGlobalChartType] = useState(ChartType.Line);
  const [showVolume, setShowVolume] = useState(false);

  // Layout configuration
  const [layoutType, setLayoutType] = useState<"grid" | "list">("grid");
  const [showCorrelation, setShowCorrelation] = useState(false);

  // Load price data for all selected symbols
  useEffect(() => {
    const loadAssetData = async () => {
      if (selectedSymbols.length === 0) return;

      setIsLoading(true);
      const newAssetData = new Map<string, AssetData>();

      try {
        // Load current prices for all symbols in parallel
        const pricePromises = selectedSymbols.map(async (symbol) => {
          try {
            const response = await cryptoService.getCurrentPrice(symbol);
            return {
              symbol,
              price: response.price,
              timestamp: response.timestamp.toLocaleString(),
              // Mock 24h change data (in real app, this would come from API)
              priceChange24h: (Math.random() - 0.5) * response.price * 0.1,
              percentChange24h: (Math.random() - 0.5) * 10,
            };
          } catch (error) {
            console.error(`Error loading data for ${symbol}:`, error);
            return null;
          }
        });

        const results = await Promise.all(pricePromises);

        results.forEach((data) => {
          if (data) {
            newAssetData.set(data.symbol, data);
          }
        });

        setAssetData(newAssetData);
      } catch (error) {
        console.error("Error loading asset data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssetData();
  }, [selectedSymbols]);

  const handleSymbolsChange = (symbols: string[]) => {
    setSelectedSymbols(symbols);
  };

  const handleRemoveSymbol = (symbolToRemove: string) => {
    setSelectedSymbols((prev) =>
      prev.filter((symbol) => symbol !== symbolToRemove),
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          Multi-Asset Comparison Dashboard
        </h1>

        {/* Symbol Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Select Assets to Compare
          </h2>
          <MultiSymbolSelector
            selectedSymbols={selectedSymbols}
            onSymbolsChange={handleSymbolsChange}
            maxSymbols={6}
          />
        </div>

        {/* Global Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Chart Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Chart Type */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Chart Type
              </label>
              <select
                value={globalChartType}
                onChange={(e) =>
                  setGlobalChartType(e.target.value as ChartType)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value={ChartType.Line}>Line Chart</option>
                <option value={ChartType.Candlestick}>Candlestick Chart</option>
              </select>
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Timeframe
              </label>
              <select
                value={globalTimeframe}
                onChange={(e) =>
                  setGlobalTimeframe(Number(e.target.value) as Timeframe)
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

            {/* Layout Type */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Layout
              </label>
              <select
                value={layoutType}
                onChange={(e) =>
                  setLayoutType(e.target.value as "grid" | "list")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="grid">Grid Layout</option>
                <option value="list">List Layout</option>
              </select>
            </div>

            {/* Additional Options */}
            <div className="flex flex-col space-y-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                Options
              </label>
              {globalChartType === ChartType.Candlestick && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showVolume}
                    onChange={(e) => setShowVolume(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Show Volume</span>
                </label>
              )}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showCorrelation}
                  onChange={(e) => setShowCorrelation(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Show Correlation</span>
              </label>
            </div>
          </div>
        </div>

        {/* Portfolio Summary */}
        {selectedSymbols.length > 0 && (
          <div className="mb-6">
            <PortfolioSummary assetData={assetData} isLoading={isLoading} />
          </div>
        )}

        {/* Correlation Matrix */}
        {showCorrelation && selectedSymbols.length > 1 && (
          <div className="mb-6">
            <CorrelationMatrix
              symbols={selectedSymbols}
              timeframe={globalTimeframe}
            />
          </div>
        )}
      </div>

      {/* Charts Layout */}
      {selectedSymbols.length > 0 && (
        <div
          className={`grid gap-6 ${
            layoutType === "grid"
              ? selectedSymbols.length === 1
                ? "grid-cols-1"
                : selectedSymbols.length === 2
                  ? "grid-cols-1 lg:grid-cols-2"
                  : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1"
          }`}
        >
          {selectedSymbols.map((symbol) => {
            const data = assetData.get(symbol);

            return (
              <div
                key={symbol}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
              >
                {/* Asset Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{symbol}</h3>
                    {data && (
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-2xl font-semibold">
                          ${data.price.toFixed(2)}
                        </span>
                        {data.percentChange24h !== undefined && (
                          <span
                            className={`text-sm font-medium ${
                              data.percentChange24h >= 0
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {data.percentChange24h >= 0 ? "+" : ""}
                            {data.percentChange24h.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveSymbol(symbol)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title={`Remove ${symbol}`}
                  >
                    ✕
                  </button>
                </div>

                {/* Chart */}
                <div className="h-64 lg:h-80">
                  {globalChartType === ChartType.Candlestick ? (
                    <CandlestickChart
                      symbol={symbol}
                      timeframe={globalTimeframe}
                      showVolume={showVolume}
                      interactive={true}
                    />
                  ) : (
                    <PriceChart
                      symbol={symbol}
                      timeframe={globalTimeframe}
                      interactive={true}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {selectedSymbols.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
            No Assets Selected
          </h3>
          <p className="text-gray-500">
            Select cryptocurrency symbols above to start comparing their
            performance.
          </p>
        </div>
      )}
    </div>
  );
}

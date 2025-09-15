import { useState, useEffect } from "react";
import { cryptoService } from "../../services/cryptoService";
import { Timeframe } from "../../types/domain";

interface CorrelationMatrixProps {
  symbols: string[];
  timeframe: Timeframe;
}

interface CorrelationData {
  symbol1: string;
  symbol2: string;
  correlation: number;
}

export function CorrelationMatrix({
  symbols,
  timeframe,
}: CorrelationMatrixProps) {
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateCorrelations = async () => {
      if (symbols.length < 2) {
        setCorrelationData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch historical price data for all symbols
        const priceDataPromises = symbols.map(async (symbol) => {
          const response = await cryptoService.getHistoricalPrices(
            symbol,
            timeframe,
          );
          return {
            symbol,
            prices: response.prices.map((p) => p.price),
          };
        });

        const allPriceData = await Promise.all(priceDataPromises);

        // Calculate correlations between each pair of symbols
        const correlations: CorrelationData[] = [];

        for (let i = 0; i < symbols.length; i++) {
          for (let j = i; j < symbols.length; j++) {
            const symbol1 = symbols[i];
            const symbol2 = symbols[j];

            const data1 = allPriceData.find((d) => d.symbol === symbol1);
            const data2 = allPriceData.find((d) => d.symbol === symbol2);

            if (!data1 || !data2) continue;

            const correlation =
              i === j
                ? 1
                : calculatePearsonCorrelation(data1.prices, data2.prices);

            correlations.push({
              symbol1,
              symbol2,
              correlation,
            });
          }
        }

        setCorrelationData(correlations);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to calculate correlations",
        );
      } finally {
        setIsLoading(false);
      }
    };

    calculateCorrelations();
  }, [symbols, timeframe]);

  // Calculate Pearson correlation coefficient
  const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    // Take the same length arrays
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);

    const sumX = xSlice.reduce((a, b) => a + b, 0);
    const sumY = ySlice.reduce((a, b) => a + b, 0);
    const sumXY = xSlice.reduce((sum, xi, i) => sum + xi * ySlice[i], 0);
    const sumX2 = xSlice.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = ySlice.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getCorrelation = (symbol1: string, symbol2: string): number => {
    const correlation = correlationData.find(
      (c) =>
        (c.symbol1 === symbol1 && c.symbol2 === symbol2) ||
        (c.symbol1 === symbol2 && c.symbol2 === symbol1),
    );
    return correlation?.correlation ?? 0;
  };

  const getCorrelationColor = (correlation: number): string => {
    const absCorr = Math.abs(correlation);
    if (absCorr > 0.7) return correlation > 0 ? "bg-green-500" : "bg-red-500";
    if (absCorr > 0.5) return correlation > 0 ? "bg-green-400" : "bg-red-400";
    if (absCorr > 0.3) return correlation > 0 ? "bg-green-300" : "bg-red-300";
    if (absCorr > 0.1) return correlation > 0 ? "bg-green-200" : "bg-red-200";
    return "bg-gray-200 dark:bg-gray-600";
  };

  const getTextColor = (correlation: number): string => {
    const absCorr = Math.abs(correlation);
    return absCorr > 0.5 ? "text-white" : "text-gray-800 dark:text-gray-200";
  };

  if (symbols.length < 2) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Correlation Matrix</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Based on{" "}
          {timeframe === Timeframe.Hour
            ? "1 Hour"
            : timeframe === Timeframe.Day
              ? "1 Day"
              : timeframe === Timeframe.Week
                ? "1 Week"
                : "Historical"}{" "}
          data
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${symbols.length + 1}, 1fr)`,
            }}
          >
            {[...Array((symbols.length + 1) * (symbols.length + 1))].map(
              (_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ),
            )}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">
            Error calculating correlations
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {error}
          </div>
        </div>
      ) : (
        <>
          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-16 h-12"></th>
                  {symbols.map((symbol) => (
                    <th
                      key={symbol}
                      className="text-center font-medium p-2 min-w-16"
                    >
                      {symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map((symbol1) => (
                  <tr key={symbol1}>
                    <td className="font-medium p-2 text-right pr-4">
                      {symbol1}
                    </td>
                    {symbols.map((symbol2) => {
                      const correlation = getCorrelation(symbol1, symbol2);
                      return (
                        <td key={symbol2} className="p-1">
                          <div
                            className={`
                              h-12 flex items-center justify-center rounded text-sm font-medium
                              ${getCorrelationColor(correlation)} ${getTextColor(correlation)}
                            `}
                            title={`${symbol1} vs ${symbol2}: ${correlation.toFixed(3)}`}
                          >
                            {correlation.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">
                Correlation:
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Strong Negative (-0.7 to -1.0)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-red-300 rounded"></div>
              <span>Weak Negative (-0.3 to -0.7)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
              <span>No Correlation (-0.3 to 0.3)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-green-300 rounded"></div>
              <span>Weak Positive (0.3 to 0.7)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Strong Positive (0.7 to 1.0)</span>
            </div>
          </div>

          {/* Insights */}
          {correlationData.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Key Insights:
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                {(() => {
                  const nonDiagonalCorrelations = correlationData.filter(
                    (c) => c.symbol1 !== c.symbol2,
                  );
                  const strongCorrelations = nonDiagonalCorrelations.filter(
                    (c) => Math.abs(c.correlation) > 0.7,
                  );
                  const weakCorrelations = nonDiagonalCorrelations.filter(
                    (c) => Math.abs(c.correlation) < 0.3,
                  );

                  const insights = [];

                  if (strongCorrelations.length > 0) {
                    const strongest = strongCorrelations.reduce((max, c) =>
                      Math.abs(c.correlation) > Math.abs(max.correlation)
                        ? c
                        : max,
                    );
                    insights.push(
                      <li key="strong">
                        Strongest correlation: {strongest.symbol1} and{" "}
                        {strongest.symbol2} ({strongest.correlation.toFixed(3)})
                      </li>,
                    );
                  }

                  if (weakCorrelations.length > 0) {
                    insights.push(
                      <li key="weak">
                        {weakCorrelations.length} pair
                        {weakCorrelations.length > 1 ? "s" : ""} show
                        {weakCorrelations.length === 1 ? "s" : ""} weak
                        correlation (good for diversification)
                      </li>,
                    );
                  }

                  const avgCorrelation =
                    nonDiagonalCorrelations.reduce(
                      (sum, c) => sum + Math.abs(c.correlation),
                      0,
                    ) / nonDiagonalCorrelations.length;
                  insights.push(
                    <li key="avg">
                      Average correlation strength: {avgCorrelation.toFixed(3)}
                    </li>,
                  );

                  return insights;
                })()}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

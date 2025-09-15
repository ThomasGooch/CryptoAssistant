import { useEffect, useRef, useState, useCallback } from "react";
import { Chart } from "chart.js/auto";
import type { ChartConfiguration, ChartDataset } from "chart.js";
import { cryptoService } from "../../services/cryptoService";
import { indicatorChartService } from "../../services/indicatorChartService";
import { Timeframe, IndicatorType, type HistoricalPrice, type IndicatorConfig } from "../../types/domain";

interface EnhancedPriceChartProps {
  symbol: string;
  timeframe: Timeframe;
  interactive?: boolean;
  indicators?: IndicatorConfig[];
  showRSI?: boolean;
  showMACD?: boolean;
}

export const EnhancedPriceChart: React.FC<EnhancedPriceChartProps> = ({
  symbol,
  timeframe,
  interactive = true,
  indicators = [],
  showRSI = false,
  showMACD = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<HistoricalPrice[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const fetchData = useCallback(async () => {
    try {
      if (!symbol.trim()) {
        setLoading(false);
        setError(null);
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);
      const response = await cryptoService.getHistoricalPrices(symbol, timeframe);
      setData(response.prices);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch data"));
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchData();
    // Set up periodic refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // If there's an error or no symbol, show an empty chart
    if (error || !symbol.trim()) {
      const emptyConfig: ChartConfiguration = {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Price",
              data: [],
              borderColor: "rgb(75, 192, 192)",
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: symbol.trim() ? "No Data Available" : "Enter Symbol",
            },
          },
        },
      };
      chartInstance.current = new Chart(ctx, emptyConfig);
      return;
    }

    // Create chart with indicators
    createChartWithIndicators();
  }, [data, loading, error, symbol, interactive, indicators, showRSI, showMACD, createChartWithIndicators]);

  const createChartWithIndicators = useCallback(async () => {
    if (!chartRef.current || !data.length) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Base datasets - price data
    const labels = data.map((d) => new Date(d.timestamp).toLocaleString());
    const datasets: ChartDataset<'line'>[] = [
      {
        label: `${symbol} Price`,
        data: data.map((d) => d.price),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.1)",
        tension: 0.1,
        fill: false,
        pointRadius: 0,
        yAxisID: 'price',
      },
    ];

    // Add enabled indicators
    for (const indicator of indicators) {
      if (!indicator.enabled) continue;

      try {
        switch (indicator.type) {
          case IndicatorType.SimpleMovingAverage: {
            const smaData = await indicatorChartService.getSMAData(
              symbol,
              timeframe,
              indicator.period,
              indicator.color
            );
            datasets.push({ ...smaData, yAxisID: 'price' });
            break;
          }

          case IndicatorType.ExponentialMovingAverage: {
            const emaData = await indicatorChartService.getEMAData(
              symbol,
              timeframe,
              indicator.period,
              indicator.color
            );
            datasets.push({ ...emaData, yAxisID: 'price' });
            break;
          }

          case IndicatorType.RelativeStrengthIndex:
            if (showRSI) {
              const rsiData = await indicatorChartService.getRSIData(
                symbol,
                timeframe,
                indicator.period,
                indicator.color
              );
              datasets.push(rsiData);
            }
            break;

          case IndicatorType.BollingerBands: {
            const bbData = await indicatorChartService.getBollingerBandsData(
              symbol,
              timeframe,
              indicator.period
            );
            datasets.push(
              { ...bbData.upper, yAxisID: 'price' },
              { ...bbData.middle, yAxisID: 'price' },
              { ...bbData.lower, yAxisID: 'price' }
            );
            break;
          }

          case IndicatorType.MACD:
            if (showMACD) {
              const macdData = await indicatorChartService.getMACDData(
                symbol,
                timeframe,
                indicator.parameters?.fastPeriod || 12,
                indicator.parameters?.slowPeriod || 26,
                indicator.parameters?.signalPeriod || 9
              );
              datasets.push(macdData.macd, macdData.signal, macdData.histogram);
            }
            break;
        }
      } catch (error) {
        console.error(`Error loading ${indicator.type} indicator:`, error);
      }
    }

    // Chart configuration with multiple Y axes
    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          title: {
            display: true,
            text: `${symbol} Price with Technical Indicators`,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            enabled: interactive,
            callbacks: {
              title: (context) => {
                return labels[context[0].dataIndex];
              },
              label: (context) => {
                const value = context.parsed.y;
                const datasetLabel = context.dataset.label || '';
                
                if (datasetLabel.includes('RSI')) {
                  return `${datasetLabel}: ${value.toFixed(2)}%`;
                } else if (datasetLabel.includes('Price') || datasetLabel.includes('MA') || datasetLabel.includes('Bollinger')) {
                  return `${datasetLabel}: $${value.toFixed(2)}`;
                } else {
                  return `${datasetLabel}: ${value.toFixed(4)}`;
                }
              },
            },
          },
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Time",
            },
          },
          price: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Price (USD)",
            },
          },
          ...(showRSI && {
            rsi: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "RSI",
              },
              min: 0,
              max: 100,
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                callback: function(value: string | number) {
                  return value + '%';
                }
              }
            },
          }),
          ...(showMACD && {
            macd: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "MACD",
              },
              grid: {
                drawOnChartArea: false,
              },
            },
          }),
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, symbol, timeframe, indicators, showRSI, showMACD, interactive]);

  // Interactive mouse move handler
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!chartInstance.current || !interactive) return;
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const elements = chartInstance.current.getElementsAtEventForMode(
      { x, y },
      'nearest',
      { intersect: false },
      false
    );
    
    if (elements.length > 0) {
      setHoveredPoint(elements[0].index);
    } else {
      setHoveredPoint(null);
    }
  }, [interactive]);

  if (loading) {
    return (
      <div className="h-64 w-full relative">
        <div
          data-testid="enhanced-price-chart-loading"
          className="absolute inset-0 flex items-center justify-center text-blue-500"
        >
          <svg
            className="animate-spin h-10 w-10"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <canvas ref={chartRef} className={loading ? "hidden" : ""}></canvas>
      </div>
    );
  }

  if (error && symbol.trim()) {
    return (
      <div data-testid="enhanced-price-chart" className="relative h-96">
        <div
          data-testid="enhanced-price-chart-error"
          className="absolute inset-0 flex items-center justify-center text-red-500"
        >
          {error.message}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="enhanced-price-chart" className="relative h-96">
      {/* Interactive Controls */}
      {interactive && (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-75">
            Hover for details
          </div>
        </div>
      )}

      {/* Hovered Data Display */}
      {interactive && hoveredPoint !== null && data[hoveredPoint] && (
        <div className="absolute top-12 right-2 z-10 bg-gray-800 text-white p-3 rounded shadow-lg text-sm max-w-xs">
          <div className="font-bold">{new Date(data[hoveredPoint].timestamp).toLocaleString()}</div>
          <div className="mt-2">Price: ${data[hoveredPoint].price.toFixed(2)}</div>
          {hoveredPoint > 0 && (
            <div className={`mt-1 font-bold ${data[hoveredPoint].price > data[hoveredPoint - 1].price ? 'text-green-400' : 'text-red-400'}`}>
              {data[hoveredPoint].price > data[hoveredPoint - 1].price ? '▲' : '▼'} 
              {' '}${Math.abs(data[hoveredPoint].price - data[hoveredPoint - 1].price).toFixed(2)}
            </div>
          )}
          
          {/* Show active indicators count */}
          {indicators.filter(i => i.enabled).length > 0 && (
            <div className="mt-2 text-xs text-gray-300">
              {indicators.filter(i => i.enabled).length} indicator(s) active
            </div>
          )}
        </div>
      )}

      <canvas 
        data-testid="enhanced-price-chart-canvas" 
        ref={chartRef}
        onMouseMove={interactive ? handleMouseMove : undefined}
        className={interactive ? "cursor-crosshair" : ""}
      ></canvas>
    </div>
  );
};
import { useEffect, useRef, useState, useCallback } from "react";
import { Chart } from "chart.js/auto";
import type {
  ChartConfiguration,
  ScriptableContext,
  ChartDataset,
} from "chart.js";
import { cryptoService } from "../../services/cryptoService";
import type { CandlestickData } from "../../types/domain";
import { Timeframe } from "../../types/domain";

interface CandlestickChartProps {
  symbol: string;
  timeframe: Timeframe;
  showVolume?: boolean;
  interactive?: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  timeframe,
  showVolume = false,
  interactive = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<CandlestickData[]>([]);
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
      const response = await cryptoService.getHistoricalCandlestickData(
        symbol,
        timeframe,
      );
      setData(response.data);
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
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              label: "OHLC",
              data: [],
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgb(75, 192, 192)",
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

    // Custom candlestick rendering using bar chart with custom drawing
    const labels = data.map((d) => new Date(d.timestamp).toLocaleString());

    // Create datasets for OHLC representation
    const ohlcData = data.map((candle, index) => {
      const isBullish = candle.close > candle.open;
      return {
        x: index,
        y: candle.close,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        color: isBullish ? "#00ff00" : "#ff0000", // Green for bullish, red for bearish
      };
    });

    const datasets: ChartDataset<"bar">[] = [
      {
        label: `${symbol} Price`,
        data: ohlcData.map((d) => d.close),
        backgroundColor: (ctx: ScriptableContext<"bar">) => {
          const dataPoint = ohlcData[ctx.dataIndex];
          return dataPoint ? dataPoint.color : "#00ff00";
        },
        borderColor: (ctx: ScriptableContext<"bar">) => {
          const dataPoint = ohlcData[ctx.dataIndex];
          return dataPoint ? dataPoint.color : "#00ff00";
        },
        borderWidth: 1,
      },
    ];

    // Add volume dataset if enabled
    if (showVolume) {
      datasets.push({
        label: "Volume",
        data: data.map((d) => d.volume),
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        yAxisID: "y1",
      });
    }

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${symbol} Candlestick Chart`,
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
                const dataIndex = context.dataIndex;
                const candle = data[dataIndex];
                if (!candle) return "";

                return [
                  `Open: $${candle.open.toFixed(2)}`,
                  `High: $${candle.high.toFixed(2)}`,
                  `Low: $${candle.low.toFixed(2)}`,
                  `Close: $${candle.close.toFixed(2)}`,
                  `Volume: ${candle.volume.toLocaleString()}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Time",
            },
          },
          y: {
            title: {
              display: true,
              text: "Price (USD)",
            },
            position: "left",
          },
          ...(showVolume && {
            y1: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "Volume",
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
  }, [data, loading, error, symbol, showVolume, interactive]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!chartInstance.current || !interactive) return;

      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const elements = chartInstance.current.getElementsAtEventForMode(
        { type: "mousemove", x, y } as Event & { x: number; y: number },
        "nearest",
        { intersect: false },
        false,
      );

      if (elements.length > 0) {
        setHoveredPoint(elements[0].index);
      } else {
        setHoveredPoint(null);
      }
    },
    [interactive],
  );

  if (loading) {
    return (
      <div className="h-64 w-full relative">
        <div
          data-testid="candlestick-chart-loading"
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
      <div data-testid="candlestick-chart" className="relative h-96">
        <div
          data-testid="candlestick-chart-error"
          className="absolute inset-0 flex items-center justify-center text-red-500"
        >
          {error.message}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="candlestick-chart" className="relative h-96">
      {/* Interactive Controls */}
      {interactive && (
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <div className="px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-75">
            Hover for details
          </div>
        </div>
      )}

      {/* Hovered Data Display */}
      {interactive && hoveredPoint !== null && data[hoveredPoint] && (
        <div className="absolute top-12 right-2 z-10 bg-gray-800 text-white p-3 rounded shadow-lg text-sm">
          <div className="font-bold">
            {new Date(data[hoveredPoint].timestamp).toLocaleString()}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>Open: ${data[hoveredPoint].open.toFixed(2)}</div>
            <div>High: ${data[hoveredPoint].high.toFixed(2)}</div>
            <div>Low: ${data[hoveredPoint].low.toFixed(2)}</div>
            <div>Close: ${data[hoveredPoint].close.toFixed(2)}</div>
            <div className="col-span-2">
              Volume: {data[hoveredPoint].volume.toLocaleString()}
            </div>
          </div>
          <div
            className={`mt-2 font-bold ${data[hoveredPoint].close > data[hoveredPoint].open ? "text-green-400" : "text-red-400"}`}
          >
            {data[hoveredPoint].close > data[hoveredPoint].open ? "▲" : "▼"} $
            {Math.abs(
              data[hoveredPoint].close - data[hoveredPoint].open,
            ).toFixed(2)}
            (
            {(
              ((data[hoveredPoint].close - data[hoveredPoint].open) /
                data[hoveredPoint].open) *
              100
            ).toFixed(2)}
            %)
          </div>
        </div>
      )}

      <canvas
        data-testid="candlestick-chart-canvas"
        ref={chartRef}
        onMouseMove={interactive ? handleMouseMove : undefined}
        className={interactive ? "cursor-crosshair" : ""}
      ></canvas>
    </div>
  );
};

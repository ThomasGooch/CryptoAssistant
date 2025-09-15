import { useEffect, useRef, useState, useCallback } from "react";
import { Chart } from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import { cryptoService } from "../../services/cryptoService";
import { useCoinbaseWebSocket } from "../../hooks/useCoinbaseWebSocket";
import type { HistoricalPrice, CryptoPrice } from "../../types/domain";
import { Timeframe } from "../../types/domain";

interface LivePriceChartProps {
  symbol: string;
  timeframe: Timeframe;
  interactive?: boolean;
  enableLiveUpdates?: boolean;
}

export const LivePriceChart: React.FC<LivePriceChartProps> = ({
  symbol,
  timeframe,
  interactive = true,
  enableLiveUpdates = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<HistoricalPrice[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [livePrice, setLivePrice] = useState<CryptoPrice | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // WebSocket integration for live price updates
  const { isConnected: wsConnected, error: wsError } = useCoinbaseWebSocket({
    symbol: enableLiveUpdates ? symbol : undefined,
    autoConnect: enableLiveUpdates,
    onPriceUpdate: (price) => {
      setLivePrice(price);
    },
  });

  const fetchHistoricalData = useCallback(async () => {
    try {
      if (!symbol.trim()) {
        setLoading(false);
        setError(null);
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);
      const response = await cryptoService.getHistoricalPrices(
        symbol,
        timeframe,
      );
      setData(response.prices);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch data"));
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  // Update chart with live price data
  const updateChartWithLivePrice = useCallback(
    (price: CryptoPrice) => {
      if (!chartInstance.current || !data.length) return;

      const chart = chartInstance.current;
      const dataset = chart.data.datasets[0];

      if (!dataset || !dataset.data) return;

      // Add new data point
      const timestamp =
        typeof price.timestamp === "string"
          ? new Date(price.timestamp)
          : price.timestamp;

      chart.data.labels?.push(timestamp.toLocaleTimeString());
      (dataset.data as number[]).push(price.price);

      // Keep only last 100 data points for performance
      const maxDataPoints = 100;
      if (chart.data.labels && chart.data.labels.length > maxDataPoints) {
        chart.data.labels.shift();
        (dataset.data as number[]).shift();
      }

      chart.update("none"); // Update without animation for performance
    },
    [data.length],
  );

  // Effect to handle live price updates
  useEffect(() => {
    if (livePrice && enableLiveUpdates) {
      updateChartWithLivePrice(livePrice);
    }
  }, [livePrice, enableLiveUpdates, updateChartWithLivePrice]);

  useEffect(() => {
    fetchHistoricalData();
    // Set up periodic refresh every 5 minutes for historical data
    const interval = setInterval(fetchHistoricalData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchHistoricalData]);

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

    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels: data.map((d) => new Date(d.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: `${symbol} Price`,
            data: data.map((d) => d.price),
            borderColor:
              enableLiveUpdates && wsConnected
                ? "rgb(34, 197, 94)" // Green when live
                : "rgb(75, 192, 192)", // Blue when historical only
            backgroundColor:
              enableLiveUpdates && wsConnected
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(75, 192, 192, 0.1)",
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // Disable animation for live updates
        plugins: {
          title: {
            display: true,
            text: `${symbol} Price History ${enableLiveUpdates ? "(Live)" : ""}`,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            enabled: interactive,
            callbacks: {
              title: (context) => {
                const index = context[0].dataIndex;
                if (index < data.length) {
                  return new Date(data[index].timestamp).toLocaleString();
                }
                return "Live Update";
              },
              label: (context) => {
                const price = context.parsed.y;
                return `Price: $${price.toFixed(2)}`;
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
          },
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
  }, [
    data,
    loading,
    error,
    symbol,
    interactive,
    enableLiveUpdates,
    wsConnected,
  ]);

  // Interactive mouse move handler
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
          data-testid="live-price-chart-loading"
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
        <canvas ref={chartRef} className="hidden"></canvas>
      </div>
    );
  }

  // Only show error if there's an error AND the symbol is not empty
  if (error && symbol.trim()) {
    return (
      <div data-testid="live-price-chart" className="relative h-96">
        <div
          data-testid="live-price-chart-error"
          className="absolute inset-0 flex items-center justify-center text-red-500"
        >
          {error.message}
          {wsError && (
            <div className="mt-2 text-sm text-orange-500">
              WebSocket: {wsError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="live-price-chart" className="relative h-96">
      {/* Connection Status Indicator */}
      {enableLiveUpdates && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className={`px-2 py-1 text-xs rounded flex items-center space-x-1 ${
              wsConnected
                ? "bg-green-800 text-green-200"
                : "bg-red-800 text-red-200"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                wsConnected ? "bg-green-400" : "bg-red-400"
              }`}
            ></div>
            <span>{wsConnected ? "LIVE" : "OFFLINE"}</span>
          </div>
        </div>
      )}

      {/* Interactive Controls */}
      {interactive && (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-75">
            Hover for details
          </div>
        </div>
      )}

      {/* Live Price Display */}
      {enableLiveUpdates && livePrice && (
        <div className="absolute top-12 left-2 z-10 bg-gray-800 text-white p-2 rounded shadow-lg text-sm">
          <div className="font-bold text-green-400">
            ${livePrice.price.toFixed(2)}
          </div>
          {livePrice.percentChange24h !== undefined && (
            <div
              className={`text-xs ${
                livePrice.percentChange24h >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {livePrice.percentChange24h >= 0 ? "+" : ""}
              {livePrice.percentChange24h.toFixed(2)}%
            </div>
          )}
        </div>
      )}

      {/* Hovered Data Display */}
      {interactive && hoveredPoint !== null && data[hoveredPoint] && (
        <div className="absolute top-12 right-2 z-10 bg-gray-800 text-white p-3 rounded shadow-lg text-sm">
          <div className="font-bold">
            {new Date(data[hoveredPoint].timestamp).toLocaleString()}
          </div>
          <div className="mt-2">
            Price: ${data[hoveredPoint].price.toFixed(2)}
          </div>
          {hoveredPoint > 0 && (
            <div
              className={`mt-1 font-bold ${data[hoveredPoint].price > data[hoveredPoint - 1].price ? "text-green-400" : "text-red-400"}`}
            >
              {data[hoveredPoint].price > data[hoveredPoint - 1].price
                ? "▲"
                : "▼"}
              $
              {Math.abs(
                data[hoveredPoint].price - data[hoveredPoint - 1].price,
              ).toFixed(2)}
            </div>
          )}
        </div>
      )}

      <canvas
        data-testid="live-price-chart-canvas"
        ref={chartRef}
        onMouseMove={interactive ? handleMouseMove : undefined}
        className={interactive ? "cursor-crosshair" : ""}
      ></canvas>
    </div>
  );
};

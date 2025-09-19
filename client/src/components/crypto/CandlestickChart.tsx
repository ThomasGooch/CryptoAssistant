import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { cryptoService } from "../../services/cryptoService";
import type { CandlestickData, ElliottWavePattern, IndicatorType } from "../../types/domain";
import { Timeframe } from "../../types/domain";
import { ElliottWaveOverlay } from "./ElliottWaveOverlay";
import { IndicatorOverlay } from "./IndicatorOverlay";

interface CandlestickChartProps {
  symbol: string;
  timeframe: Timeframe;
  showVolume?: boolean;
  interactive?: boolean;
  showElliottWaves?: boolean;
  showWaveLabels?: boolean;
  showFibonacci?: boolean;
  activeIndicators?: IndicatorType[];
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  timeframe,
  showVolume = false,
  interactive = true,
  showElliottWaves = false,
  showWaveLabels = true,
  showFibonacci = true,
  activeIndicators = [],
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<CandlestickData[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [elliottWavePatterns, setElliottWavePatterns] = useState<ElliottWavePattern[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    // Disable periodic refresh when using mock data to prevent glitching
    // Only enable refresh when backend is actually available
    // const interval = setInterval(fetchData, 5 * 60 * 1000);
    // return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate chart dimensions and scales
  const chartDimensions = useMemo(() => {
    if (data.length === 0) return null;

    const margin = { top: 20, right: 60, bottom: 40, left: 60 };
    const width = 1000;
    const height = showVolume ? 600 : 500;
    const chartHeight = showVolume ? height * 0.7 : height - margin.top - margin.bottom;
    const volumeHeight = showVolume ? height * 0.25 : 0;

    const minPrice = Math.min(...data.map(d => d.low));
    const maxPrice = Math.max(...data.map(d => d.high));
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;

    const maxVolume = Math.max(...data.map(d => d.volume));

    // Price scale
    const priceScale = {
      min: minPrice - pricePadding,
      max: maxPrice + pricePadding,
      range: priceRange + (pricePadding * 2)
    };

    // X scale
    const candleWidth = Math.max(2, Math.min(20, (width - margin.left - margin.right) / data.length * 0.8));
    const candleSpacing = (width - margin.left - margin.right) / data.length;

    return {
      margin,
      width,
      height,
      chartHeight,
      volumeHeight,
      priceScale,
      maxVolume,
      candleWidth,
      candleSpacing
    };
  }, [data, showVolume]);

  // Helper functions for price and position calculations
  const getY = useCallback((price: number) => {
    if (!chartDimensions) return 0;
    const { margin, chartHeight, priceScale } = chartDimensions;
    return margin.top + chartHeight - ((price - priceScale.min) / priceScale.range) * chartHeight;
  }, [chartDimensions]);

  const getVolumeY = useCallback((volume: number) => {
    if (!chartDimensions) return 0;
    const { margin, height, volumeHeight, maxVolume } = chartDimensions;
    return height - margin.bottom - (volume / maxVolume) * volumeHeight;
  }, [chartDimensions]);

  const getX = useCallback((index: number) => {
    if (!chartDimensions) return 0;
    const { margin, candleSpacing } = chartDimensions;
    return margin.left + index * candleSpacing + candleSpacing / 2;
  }, [chartDimensions]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!interactive || !chartDimensions) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setMousePosition({ x, y });

      // Find closest candlestick
      const { margin, candleSpacing } = chartDimensions;
      const chartX = x - margin.left;
      const index = Math.round(chartX / candleSpacing);

      if (index >= 0 && index < data.length) {
        setHoveredPoint(index);
      } else {
        setHoveredPoint(null);
      }
    },
    [interactive, chartDimensions, data.length],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setMousePosition(null);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-96 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
        <div
          data-testid="candlestick-chart-loading"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-center">
            <svg
              className="animate-spin h-10 w-10 mx-auto mb-4 text-blue-500"
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
            <p className="text-gray-600 dark:text-gray-300">Loading {symbol} chart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && symbol.trim()) {
    return (
      <div data-testid="candlestick-chart" className="w-full h-96 relative bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-lg">
        <div
          data-testid="candlestick-chart-error"
          className="absolute inset-0 flex items-center justify-center text-red-600 dark:text-red-300"
        >
          <div className="text-center">
            <svg className="h-12 w-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="font-semibold">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chartDimensions || data.length === 0) {
    return (
      <div className="w-full h-96 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <p>{symbol.trim() ? "No data available" : "Enter a symbol to view chart"}</p>
        </div>
      </div>
    );
  }

  const { width, height, margin, candleWidth, chartHeight, volumeHeight } = chartDimensions;

  return (
    <div 
      data-testid="candlestick-chart" 
      className="w-full relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      ref={containerRef}
      onMouseMove={interactive ? handleMouseMove : undefined}
      onMouseLeave={interactive ? handleMouseLeave : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {symbol}-USD Price Chart with Elliott Wave Analysis
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {timeframe === Timeframe.Day ? '1 Day' : 
             timeframe === Timeframe.Hour ? '1 Hour' :
             timeframe === Timeframe.FourHours ? '4 Hours' : `${timeframe} timeframe`}
          </p>
        </div>
        
        {/* Interactive Controls */}
        {interactive && (
          <div className="flex gap-2">
            <div className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded">
              Hover for details
            </div>
            {showElliottWaves && (
              <div className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs rounded">
                Elliott Waves: ON
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="p-4">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair"
        >
          {/* Background gradient */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="1" />
              <stop offset="100%" stopColor="#f1f5f9" stopOpacity="1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Chart background */}
          <rect
            x={margin.left}
            y={margin.top}
            width={width - margin.left - margin.right}
            height={chartHeight}
            fill="url(#chartGradient)"
            className="dark:fill-gray-800"
          />

          {/* Grid lines - Horizontal */}
          {Array.from({ length: 6 }, (_, i) => {
            const y = margin.top + (i * chartHeight) / 5;
            const price = chartDimensions.priceScale.max - (i * chartDimensions.priceScale.range) / 5;
            return (
              <g key={`h-grid-${i}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                  className="dark:stroke-gray-600"
                />
                <text
                  x={width - margin.right + 5}
                  y={y}
                  dy="0.35em"
                  fontSize="10"
                  fill="#6b7280"
                  className="dark:fill-gray-400"
                >
                  ${price.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Grid lines - Vertical */}
          {data.slice(0, Math.min(data.length, 10)).map((_, i) => {
            const step = Math.max(1, Math.floor(data.length / 6));
            const index = i * step;
            if (index >= data.length) return null;
            
            const x = getX(index);
            const date = new Date(data[index].timestamp);
            return (
              <g key={`v-grid-${i}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + chartHeight}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                  className="dark:stroke-gray-600"
                />
                <text
                  x={x}
                  y={margin.top + chartHeight + 15}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6b7280"
                  className="dark:fill-gray-400"
                >
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              </g>
            );
          })}

          {/* Candlesticks */}
          {data.map((candle, index) => {
            const x = getX(index);
            const openY = getY(candle.open);
            const closeY = getY(candle.close);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);
            
            const isBullish = candle.close > candle.open;
            const bodyHeight = Math.abs(closeY - openY);
            const bodyTop = Math.min(openY, closeY);
            
            const isHovered = hoveredPoint === index;
            
            return (
              <g key={index} className={isHovered ? 'filter-glow' : ''}>
                {/* Wick (High-Low line) */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={isBullish ? '#10b981' : '#ef4444'}
                  strokeWidth={isHovered ? "2" : "1"}
                  opacity={isHovered ? 1 : 0.8}
                />
                
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={Math.max(1, bodyHeight)}
                  fill={isBullish ? '#10b981' : '#ef4444'}
                  stroke={isBullish ? '#059669' : '#dc2626'}
                  strokeWidth={isHovered ? "1.5" : "0.5"}
                  opacity={isHovered ? 0.9 : 0.8}
                  rx="1"
                  className="transition-all duration-150"
                  filter={isHovered ? "url(#glow)" : undefined}
                />
                
                {/* Open/Close markers on body edges */}
                <line
                  x1={x - candleWidth / 2}
                  y1={openY}
                  x2={x}
                  y2={openY}
                  stroke={isBullish ? '#059669' : '#dc2626'}
                  strokeWidth="1"
                  opacity={isHovered ? 1 : 0.6}
                />
                <line
                  x1={x}
                  y1={closeY}
                  x2={x + candleWidth / 2}
                  y2={closeY}
                  stroke={isBullish ? '#059669' : '#dc2626'}
                  strokeWidth="1"
                  opacity={isHovered ? 1 : 0.6}
                />
              </g>
            );
          })}

          {/* Volume bars if enabled */}
          {showVolume && data.map((candle, index) => {
            const x = getX(index);
            const volumeY = getVolumeY(candle.volume);
            const volumeBarHeight = height - margin.bottom - volumeY;
            const isBullish = candle.close > candle.open;
            
            return (
              <rect
                key={`volume-${index}`}
                x={x - candleWidth / 3}
                y={volumeY}
                width={candleWidth * 2 / 3}
                height={volumeBarHeight}
                fill={isBullish ? '#10b981' : '#ef4444'}
                opacity={0.3}
              />
            );
          })}

          {/* Crosshair for hovered point */}
          {interactive && hoveredPoint !== null && mousePosition && (
            <>
              <line
                x1={margin.left}
                y1={mousePosition.y}
                x2={width - margin.right}
                y2={mousePosition.y}
                stroke="#6366f1"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.5"
              />
              <line
                x1={mousePosition.x}
                y1={margin.top}
                x2={mousePosition.x}
                y2={margin.top + chartHeight}
                stroke="#6366f1"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.5"
              />
            </>
          )}
        </svg>

        {/* Elliott Wave Overlay */}
        {showElliottWaves && data.length > 0 && chartDimensions && (
          <ElliottWaveOverlay
            data={data}
            symbol={symbol}
            timeframe={timeframe}
            onPatternsDetected={setElliottWavePatterns}
            showLabels={showWaveLabels}
            showFibonacci={showFibonacci}
            chartDimensions={{
              width: chartDimensions.width,
              height: chartDimensions.height,
              margin: chartDimensions.margin,
              chartHeight: chartDimensions.chartHeight,
              priceScale: chartDimensions.priceScale
            }}
          />
        )}

        {/* Indicator Overlay */}
        {activeIndicators.length > 0 && data.length > 0 && chartDimensions && (
          <IndicatorOverlay
            data={data}
            symbol={symbol}
            timeframe={timeframe}
            activeIndicators={activeIndicators}
            chartDimensions={{
              width: chartDimensions.width,
              height: chartDimensions.height,
              margin: chartDimensions.margin,
              chartHeight: chartDimensions.chartHeight,
              priceScale: chartDimensions.priceScale
            }}
          />
        )}

        {/* Hover tooltip */}
        {interactive && hoveredPoint !== null && data[hoveredPoint] && mousePosition && (
          <div 
            className="absolute z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 p-3 rounded-lg shadow-xl text-sm pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: Math.min(mousePosition.x, width - 150),
              top: Math.max(mousePosition.y - 10, 0),
            }}
          >
            <div className="font-bold text-center border-b border-gray-600 dark:border-gray-400 pb-2 mb-2">
              {new Date(data[hoveredPoint].timestamp).toLocaleString()}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>Open:</div><div className="font-mono">${data[hoveredPoint].open.toFixed(2)}</div>
              <div>High:</div><div className="font-mono">${data[hoveredPoint].high.toFixed(2)}</div>
              <div>Low:</div><div className="font-mono">${data[hoveredPoint].low.toFixed(2)}</div>
              <div>Close:</div><div className="font-mono">${data[hoveredPoint].close.toFixed(2)}</div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-600 dark:border-gray-400">
              <div>Volume: <span className="font-mono">{data[hoveredPoint].volume.toLocaleString()}</span></div>
            </div>
            <div
              className={`mt-2 pt-2 border-t border-gray-600 dark:border-gray-400 font-bold ${
                data[hoveredPoint].close > data[hoveredPoint].open 
                  ? "text-green-400 dark:text-green-600" 
                  : "text-red-400 dark:text-red-600"
              }`}
            >
              {data[hoveredPoint].close > data[hoveredPoint].open ? "▲" : "▼"} $
              {Math.abs(data[hoveredPoint].close - data[hoveredPoint].open).toFixed(2)}
              {' '}
              ({((data[hoveredPoint].close - data[hoveredPoint].open) / data[hoveredPoint].open * 100).toFixed(2)}%)
            </div>
            
            {/* Elliott Wave patterns info */}
            {showElliottWaves && elliottWavePatterns.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-600 dark:border-gray-400">
                <div className="text-xs text-blue-400 dark:text-blue-600 font-semibold">Elliott Waves:</div>
                {elliottWavePatterns.slice(0, 2).map((pattern) => (
                  <div key={pattern.id} className="text-xs">
                    {pattern.type}: {(pattern.confidence * 100).toFixed(0)}% conf.
                  </div>
                ))}
              </div>
            )}
            
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

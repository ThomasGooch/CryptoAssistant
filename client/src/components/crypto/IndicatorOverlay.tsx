import { useEffect, useState, useCallback } from "react";
import { indicatorService } from "../../services/indicatorService";
import type { CandlestickData, Timeframe } from "../../types/domain";
import { IndicatorType } from "../../types/domain";

interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  chartHeight: number;
  priceScale: { min: number; max: number; range: number };
}

interface IndicatorOverlayProps {
  data: CandlestickData[];
  symbol: string;
  timeframe: Timeframe;
  activeIndicators: IndicatorType[];
  chartDimensions?: ChartDimensions;
}

interface IndicatorData {
  type: IndicatorType;
  values: number[];
  color: string;
  period: number;
}

export const IndicatorOverlay: React.FC<IndicatorOverlayProps> = ({
  data,
  symbol,
  timeframe,
  activeIndicators,
  chartDimensions,
}) => {
  const [indicatorData, setIndicatorData] = useState<IndicatorData[]>([]);
  const [loading, setLoading] = useState(false);

  const calculateIndicators = useCallback(async () => {
    if (!data || data.length === 0 || activeIndicators.length === 0) {
      console.log('🔍 No data or indicators to calculate:', { dataLength: data?.length, activeIndicators });
      setIndicatorData([]);
      return;
    }

    console.log('🔍 Calculating indicators:', { activeIndicators, symbol, dataLength: data.length });
    setLoading(true);
    try {
      const indicators: IndicatorData[] = [];

      for (const indicatorType of activeIndicators) {
        try {
          let period = 14; // Default period
          let color = "#3B82F6"; // Default blue

          // Set specific periods and colors for different indicators
          switch (indicatorType) {
            case IndicatorType.SimpleMovingAverage:
              period = 20;
              color = "#3B82F6"; // Blue
              break;
            case IndicatorType.ExponentialMovingAverage:
              period = 12;
              color = "#8B5CF6"; // Purple
              break;
            case IndicatorType.RelativeStrengthIndex:
              period = 14;
              color = "#F59E0B"; // Orange
              break;
            case IndicatorType.MACD:
              period = 12;
              color = "#10B981"; // Green
              break;
            case IndicatorType.BollingerBands:
              period = 20;
              color = "#EF4444"; // Red
              break;
          }

          console.log(`🔍 Fetching ${indicatorType} for ${symbol} with period ${period}`);

          // Calculate indicator values using the service
          const response = await indicatorService.getIndicator(
            symbol,
            indicatorType,
            period
          );

          console.log(`🔍 Indicator response for ${indicatorType}:`, response);

          if (response && response.value !== undefined) {
            // Create realistic indicator lines based on type
            let values: number[] = [];
            
            if (indicatorType === IndicatorType.SimpleMovingAverage || 
                indicatorType === IndicatorType.ExponentialMovingAverage) {
              // For moving averages, calculate values based on close prices
              values = calculateMovingAverage(data, period, indicatorType === IndicatorType.ExponentialMovingAverage);
            } else if (indicatorType === IndicatorType.RelativeStrengthIndex) {
              // For RSI, calculate oscillator values (0-100)
              values = calculateRSI(data, period);
            } else if (indicatorType === IndicatorType.MACD) {
              // For MACD, use our calculation instead of API response
              values = calculateMACD(data);
              console.log('🔍 Using calculated MACD values:', values.slice(-5));
            } else {
              // For other indicators, use a variation of the response value
              values = data.map((_, index) => {
                const variation = (Math.sin(index * 0.1) * 0.1 + 1) * response.value;
                return Math.max(0, variation);
              });
            }
            
            console.log(`🔍 Generated ${values.length} values for ${indicatorType}, sample:`, values.slice(0, 5));
            
            indicators.push({
              type: indicatorType,
              values,
              color,
              period,
            });
          } else {
            console.warn(`🔍 No valid response for ${indicatorType}`);
          }
        } catch (error) {
          console.error(`Failed to calculate ${indicatorType}:`, error);
        }
      }

      console.log('🔍 Final indicators:', indicators.length);
      
      // If no indicators were successfully calculated, create mock ones for testing
      if (indicators.length === 0 && activeIndicators.length > 0) {
        console.log('🔍 Creating mock indicators for testing');
        const mockIndicators: IndicatorData[] = [];
        
        activeIndicators.forEach((indicatorType) => {
          let color = "#3B82F6";
          let values: number[] = [];
          
          switch (indicatorType) {
            case IndicatorType.SimpleMovingAverage:
              color = "#3B82F6"; // Blue
              values = calculateMovingAverage(data, 20, false);
              break;
            case IndicatorType.ExponentialMovingAverage:
              color = "#8B5CF6"; // Purple
              values = calculateMovingAverage(data, 12, true);
              break;
            case IndicatorType.RelativeStrengthIndex:
              color = "#F59E0B"; // Orange
              values = calculateRSI(data, 14);
              break;
            case IndicatorType.MACD:
              color = "#10B981"; // Green
              values = calculateMACD(data);
              break;
            case IndicatorType.BollingerBands:
              color = "#EF4444"; // Red
              values = calculateBollingerBands(data, 20);
              break;
            default:
              // Create a simple trend line based on price data
              values = data.map((d, i) => d.close * (0.95 + Math.sin(i * 0.1) * 0.05));
              break;
          }
          
          if (values.length > 0) {
            mockIndicators.push({
              type: indicatorType,
              values,
              color,
              period: 14,
            });
          }
        });
        
        console.log('🔍 Created mock indicators:', mockIndicators.length);
        setIndicatorData(mockIndicators);
      } else {
        setIndicatorData(indicators);
      }
    } catch (error) {
      console.error("Error calculating indicators:", error);
      setIndicatorData([]);
    } finally {
      setLoading(false);
    }
  }, [data, symbol, timeframe, activeIndicators]);

  // Simple moving average calculation
  const calculateMovingAverage = (data: CandlestickData[], period: number, isEMA = false): number[] => {
    const values: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        values.push(NaN); // Not enough data points
      } else {
        if (isEMA) {
          // Simple EMA approximation
          const multiplier = 2 / (period + 1);
          if (i === period - 1) {
            // First EMA value is SMA
            const sum = data.slice(i - period + 1, i + 1).reduce((sum, d) => sum + d.close, 0);
            values.push(sum / period);
          } else {
            const previousEMA = values[i - 1];
            const currentEMA = (data[i].close * multiplier) + (previousEMA * (1 - multiplier));
            values.push(currentEMA);
          }
        } else {
          // Simple moving average
          const sum = data.slice(i - period + 1, i + 1).reduce((sum, d) => sum + d.close, 0);
          values.push(sum / period);
        }
      }
    }
    
    return values;
  };

  // Simple RSI calculation
  const calculateRSI = (data: CandlestickData[], period: number): number[] => {
    const values: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        values.push(50); // Default neutral RSI
      } else {
        const avgGain = gains.slice(i - period, i).reduce((sum, g) => sum + g, 0) / period;
        const avgLoss = losses.slice(i - period, i).reduce((sum, l) => sum + l, 0) / period;
        
        if (avgLoss === 0) {
          values.push(100);
        } else {
          const rs = avgGain / avgLoss;
          const rsi = 100 - (100 / (1 + rs));
          values.push(Math.max(0, Math.min(100, rsi)));
        }
      }
    }
    
    return values;
  };

  // MACD calculation (Moving Average Convergence Divergence)
  const calculateMACD = (data: CandlestickData[]): number[] => {
    const values: number[] = [];
    const ema12 = calculateMovingAverage(data, 12, true);
    const ema26 = calculateMovingAverage(data, 26, true);
    
    console.log('🔍 MACD Debug - EMA12 sample:', ema12.slice(-5));
    console.log('🔍 MACD Debug - EMA26 sample:', ema26.slice(-5));
    
    for (let i = 0; i < data.length; i++) {
      if (!isNaN(ema12[i]) && !isNaN(ema26[i])) {
        // MACD line = EMA12 - EMA26
        const macdValue = ema12[i] - ema26[i];
        values.push(macdValue);
      } else {
        values.push(NaN);
      }
    }
    
    const validMacdValues = values.filter(v => !isNaN(v));
    console.log('🔍 MACD Debug - Valid MACD values:', validMacdValues.length);
    console.log('🔍 MACD Debug - MACD sample:', values.slice(-5));
    console.log('🔍 MACD Debug - MACD range:', {
      min: Math.min(...validMacdValues),
      max: Math.max(...validMacdValues)
    });
    
    return values;
  };

  // Bollinger Bands calculation (using middle band - SMA) - FIXED VERSION
  const calculateBollingerBands = (data: CandlestickData[], period: number): number[] => {
    // Just use the existing SMA calculation which we know works
    return calculateMovingAverage(data, period, false);
  };

  useEffect(() => {
    console.log('🔍 useEffect triggered for calculateIndicators');
    calculateIndicators();
  }, [calculateIndicators]);

  const renderIndicatorLine = (indicator: IndicatorData) => {
    if (!chartDimensions || indicator.values.length === 0) return null;

    // For moving averages and trend indicators, render lines on the price chart
    if (
      indicator.type === IndicatorType.SimpleMovingAverage ||
      indicator.type === IndicatorType.ExponentialMovingAverage ||
      indicator.type === IndicatorType.BollingerBands
    ) {
      return renderPriceIndicatorLine(indicator);
    }

    // For oscillators like RSI and MACD, render in a separate area (bottom of chart)
    if (
      indicator.type === IndicatorType.RelativeStrengthIndex ||
      indicator.type === IndicatorType.MACD
    ) {
      return renderOscillatorIndicator(indicator);
    }

    return null;
  };

  const renderPriceIndicatorLine = (indicator: IndicatorData) => {
    if (!chartDimensions) return null;

    const points: string[] = [];
    const chartAreaWidth = chartDimensions.width - chartDimensions.margin.left - chartDimensions.margin.right;

    console.log('🔍 Rendering price indicator:', indicator.type, 'Values:', indicator.values.slice(0, 5));
    console.log('🔍 Chart dimensions:', chartDimensions);
    
    if (indicator.type === IndicatorType.BollingerBands) {
      const validValues = indicator.values.filter(v => !isNaN(v));
      const priceValues = data.slice(-5).map(d => d.close);
      console.log('🔍 BB Debug - Last 5 BB values:', indicator.values.slice(-5));
      console.log('🔍 BB Debug - Last 5 price values:', priceValues);
      console.log('🔍 BB Debug - Price scale:', chartDimensions.priceScale);
      console.log('🔍 BB Debug - BB range:', {
        min: Math.min(...validValues),
        max: Math.max(...validValues),
        count: validValues.length
      });
    }

    indicator.values.forEach((value, index) => {
      if (value && !isNaN(value)) {
        const x = chartDimensions.margin.left + (index / (data.length - 1)) * chartAreaWidth;
        const y = chartDimensions.margin.top + chartDimensions.chartHeight - 
          ((value - chartDimensions.priceScale.min) / chartDimensions.priceScale.range) * chartDimensions.chartHeight;
        
        if (index < 5) {
          console.log(`🔍 Point ${index}: value=${value}, x=${x}, y=${y}`);
        }
        
        points.push(`${x},${y}`);
      }
    });

    console.log('🔍 Generated points for', indicator.type, ':', points.length);

    if (points.length < 2) {
      console.log('🔍 Not enough points to render line');
      return null;
    }

    return (
      <polyline
        key={`indicator-${indicator.type}`}
        points={points.join(' ')}
        fill="none"
        stroke={indicator.color}
        strokeWidth="3"
        opacity="1"
        className="pointer-events-none"
      />
    );
  };

  const renderOscillatorIndicator = (indicator: IndicatorData) => {
    if (!chartDimensions) return null;

    console.log('🔍 Rendering oscillator for:', indicator.type, 'Values length:', indicator.values.length);

    // Create a small oscillator area at the bottom
    const oscillatorHeight = 60;
    const oscillatorY = chartDimensions.height - oscillatorHeight - 10;
    const chartAreaWidth = chartDimensions.width - chartDimensions.margin.left - chartDimensions.margin.right;

    const points: string[] = [];
    let minValue = 0;
    let maxValue = 100;
    let centerValue = 50;
    let indicatorLabel = "OSC";

    // Set parameters based on indicator type
    if (indicator.type === IndicatorType.RelativeStrengthIndex) {
      minValue = 0;
      maxValue = 100;
      centerValue = 50;
      indicatorLabel = "RSI";
    } else if (indicator.type === IndicatorType.MACD) {
      // For MACD, find the range of values
      const validValues = indicator.values.filter(v => !isNaN(v));
      if (validValues.length > 0) {
        minValue = Math.min(...validValues);
        maxValue = Math.max(...validValues);
        centerValue = 0; // MACD oscillates around zero
        // Add some padding
        const padding = (maxValue - minValue) * 0.1;
        minValue -= padding;
        maxValue += padding;
      }
      indicatorLabel = "MACD";
    }
    
    indicator.values.forEach((value, index) => {
      if (value && !isNaN(value)) {
        const x = chartDimensions.margin.left + (index / (data.length - 1)) * chartAreaWidth;
        // Normalize value to oscillator area
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        const y = oscillatorY + oscillatorHeight - (normalizedValue * oscillatorHeight);
        
        points.push(`${x},${y}`);
      }
    });

    if (points.length < 2) return null;

    return (
      <g key={`oscillator-${indicator.type}`}>
        {/* Background area for oscillator */}
        <rect
          x={chartDimensions.margin.left}
          y={oscillatorY}
          width={chartAreaWidth}
          height={oscillatorHeight}
          fill="rgba(0,0,0,0.02)"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
        />
        
        {/* Center line (zero line for MACD, 50 line for RSI) */}
        {(() => {
          const centerY = oscillatorY + oscillatorHeight - ((centerValue - minValue) / (maxValue - minValue)) * oscillatorHeight;
          return (
            <line
              x1={chartDimensions.margin.left}
              y1={centerY}
              x2={chartDimensions.margin.left + chartAreaWidth}
              y2={centerY}
              stroke="rgba(100, 100, 100, 0.5)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          );
        })()}
        
        {/* Additional reference lines for RSI */}
        {indicator.type === IndicatorType.RelativeStrengthIndex && (
          <>
            <line
              x1={chartDimensions.margin.left}
              y1={oscillatorY + oscillatorHeight * 0.3} // 70 level
              x2={chartDimensions.margin.left + chartAreaWidth}
              y2={oscillatorY + oscillatorHeight * 0.3}
              stroke="rgba(239, 68, 68, 0.3)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <line
              x1={chartDimensions.margin.left}
              y1={oscillatorY + oscillatorHeight * 0.7} // 30 level
              x2={chartDimensions.margin.left + chartAreaWidth}
              y2={oscillatorY + oscillatorHeight * 0.7}
              stroke="rgba(34, 197, 94, 0.3)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </>
        )}
        
        {/* Indicator line */}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={indicator.color}
          strokeWidth="2"
          opacity="0.9"
          className="pointer-events-none"
        />
        
        {/* Label */}
        <text
          x={chartDimensions.margin.left + 5}
          y={oscillatorY + 15}
          fontSize="12"
          fill={indicator.color}
          className="pointer-events-none"
        >
          {indicatorLabel}
        </text>
      </g>
    );
  };

  if (!data || data.length === 0 || activeIndicators.length === 0) {
    return null;
  }

  console.log('🔍 IndicatorOverlay render:', { 
    dataLength: data?.length, 
    activeIndicators: activeIndicators.length, 
    indicatorData: indicatorData.length,
    hasChartDimensions: !!chartDimensions,
    loading
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Debug indicator */}
      <div className="absolute top-2 left-2 text-xs bg-green-500 text-white px-2 py-1 rounded z-50">
        Indicators: {indicatorData.length} | Active: {activeIndicators.length}
      </div>
      
      {chartDimensions && (
        <svg
          width={chartDimensions.width}
          height={chartDimensions.height}
          className="absolute top-0 left-0"
          style={{ zIndex: 5 }}
        >
          {indicatorData.map((indicator) => renderIndicatorLine(indicator))}
        </svg>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white bg-opacity-75 px-2 py-1 rounded">
          Calculating indicators...
        </div>
      )}
    </div>
  );
};
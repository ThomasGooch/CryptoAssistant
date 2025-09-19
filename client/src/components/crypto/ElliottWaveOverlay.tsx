import { useEffect, useState, useCallback } from "react";
import { elliottWaveService } from "../../services/elliottWaveService";
import type { CandlestickData, ElliottWavePattern, Timeframe } from "../../types/domain";

interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  chartHeight: number;
  priceScale: { min: number; max: number; range: number };
}

interface ElliottWaveOverlayProps {
  data: CandlestickData[];
  symbol?: string;
  timeframe?: Timeframe;
  onPatternsDetected?: (patterns: ElliottWavePattern[]) => void;
  showLabels?: boolean;
  showFibonacci?: boolean;
  chartDimensions?: ChartDimensions;
}

export const ElliottWaveOverlay: React.FC<ElliottWaveOverlayProps> = ({
  data,
  symbol = 'BTC',
  onPatternsDetected,
  showLabels = true,
  showFibonacci = true,
  chartDimensions,
}) => {
  const [impulsePatterns, setImpulsePatterns] = useState<ElliottWavePattern[]>([]);
  const [correctivePatterns, setCorrectivePatterns] = useState<ElliottWavePattern[]>([]);
  const [loading, setLoading] = useState(false);

  const analyzePatterns = useCallback(async () => {
    if (!data || data.length === 0) {
      setImpulsePatterns([]);
      setCorrectivePatterns([]);
      return;
    }

    setLoading(true);
    try {
      const impulse = elliottWaveService.detectImpulseWaves(data);
      const corrective = elliottWaveService.detectCorrectiveWaves(data);
      
      // Debug logging to understand pattern detection
      console.log('🌊 Elliott Wave Detection Results:', {
        dataPoints: data.length,
        impulsePatterns: impulse.length,
        correctivePatterns: corrective.length,
        impulseConfidences: impulse.map(p => p.confidence.toFixed(2)),
        correctiveConfidences: corrective.map(p => p.confidence.toFixed(2))
      });
      
      setImpulsePatterns(impulse);
      setCorrectivePatterns(corrective);
      
      const allPatterns = [...impulse, ...corrective];
      onPatternsDetected?.(allPatterns);
    } catch (error) {
      console.error("Elliott Wave analysis failed:", error);
      setImpulsePatterns([]);
      setCorrectivePatterns([]);
    } finally {
      setLoading(false);
    }
  }, [data, symbol, onPatternsDetected]);

  useEffect(() => {
    analyzePatterns();
  }, [analyzePatterns]);

  const renderWaveLabel = (wave: any, patternType: string, index: number) => {
    if (!chartDimensions) return null;

    const isImpulse = patternType === "impulse";
    const bgColor = isImpulse ? "rgba(34, 197, 94, 0.9)" : "rgba(251, 146, 60, 0.9)";
    const textColor = "#ffffff";
    
    // Get the price at the wave point 
    const wavePrice = wave.end.price || data[wave.end.index]?.high || data[wave.end.index]?.close;
    if (!wavePrice) return null;
    
    // Calculate X position within the chart area (accounting for left margin)
    const chartAreaWidth = chartDimensions.width - chartDimensions.margin.left - chartDimensions.margin.right;
    const xPositionInChart = (wave.end.index / (data.length - 1)) * chartAreaWidth;
    const xPosition = chartDimensions.margin.left + xPositionInChart;
    const xPercent = (xPosition / chartDimensions.width) * 100;
    
    // Calculate Y position within the chart area using the chart's price scale
    const yPositionInChart = chartDimensions.margin.top + chartDimensions.chartHeight - 
      ((wavePrice - chartDimensions.priceScale.min) / chartDimensions.priceScale.range) * chartDimensions.chartHeight;
    const yPercent = (yPositionInChart / chartDimensions.height) * 100;
    
    // Debug logging for first few waves
    if (index < 3) {
      console.log(`📍 Wave ${wave.label} positioning:`, {
        wavePrice,
        priceScale: chartDimensions.priceScale,
        xPercent: xPercent.toFixed(1),
        yPercent: yPercent.toFixed(1),
        chartDimensions: {
          width: chartDimensions.width,
          height: chartDimensions.height,
          margin: chartDimensions.margin
        }
      });
    }
    
    return (
      <div
        key={`${patternType}-${index}-${wave.label}`}
        className="absolute text-xs font-semibold pointer-events-none z-10 px-2 py-1 rounded-md"
        style={{
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          backgroundColor: bgColor,
          color: textColor,
          transform: "translate(-50%, -50%)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {wave.label}
      </div>
    );
  };

  const renderFibonacciLevels = (pattern: ElliottWavePattern, patternIndex: number) => {
    if (!showFibonacci || !chartDimensions) return null;

    const levels = pattern.fibonacciLevels.levels;

    // Show only the most important Fibonacci level to minimize clutter - the Golden Ratio
    const keyLevels = ['0.618']; // Only the golden ratio - most significant level
    const filteredLevels = Object.entries(levels).filter(([ratio]) => keyLevels.includes(ratio));

    return filteredLevels.map(([ratio, price]) => {
      // Calculate Y position within the chart area using the chart's price scale (same as wave labels)
      const yPositionInChart = chartDimensions.margin.top + chartDimensions.chartHeight - 
        ((price - chartDimensions.priceScale.min) / chartDimensions.priceScale.range) * chartDimensions.chartHeight;
      const yPercent = (yPositionInChart / chartDimensions.height) * 100;
      
      // Position at right edge of chart area
      const rightPosition = chartDimensions.width - chartDimensions.margin.right;
      const xPercent = (rightPosition / chartDimensions.width) * 100;
      
      // Determine level importance for styling
      const isKeyLevel = ratio === '0.618' || ratio === '0.5';
      const levelType = getCurrentPrice() > price ? 'support' : 'resistance';

      return (
        <div
          key={`fib-${patternIndex}-${ratio}`}
          className="absolute pointer-events-none text-xs font-medium px-2 py-1 rounded"
          style={{
            left: `${xPercent}%`,
            top: `${yPercent}%`,
            backgroundColor: levelType === 'support' ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)",
            color: "#ffffff",
            transform: "translateY(-50%)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          61.8% ${price.toFixed(0)}
        </div>
      );
    });
  };

  const getCurrentPrice = () => {
    if (!data || data.length === 0) return 0;
    return data[data.length - 1].close;
  };

  // Trading signal panel removed per user request

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <>
      <div className="absolute inset-0 pointer-events-none">
        {/* Wave Labels */}
        {showLabels && impulsePatterns.map((pattern, patternIndex) =>
          pattern.waves.map((wave, waveIndex) =>
            renderWaveLabel(wave, "impulse", patternIndex * 10 + waveIndex)
          )
        )}
        
        {showLabels && correctivePatterns.map((pattern, patternIndex) =>
          pattern.waves.map((wave, waveIndex) =>
            renderWaveLabel(wave, "corrective", patternIndex * 10 + waveIndex)
          )
        )}

        {/* Enhanced Fibonacci Levels with Support/Resistance Indicators */}
        {/* Show fibonacci levels only for the most recent high-confidence pattern to reduce clutter */}
        {(() => {
          const allPatterns = [...impulsePatterns, ...correctivePatterns];
          const bestPattern = allPatterns
            .filter(pattern => pattern.confidence > 0.5)
            .sort((a, b) => {
              // Prefer impulse patterns over corrective patterns when confidence is similar
              if (Math.abs(a.confidence - b.confidence) < 0.1) {
                return a.type === 'impulse' ? -1 : (b.type === 'impulse' ? 1 : 0);
              }
              return b.confidence - a.confidence;
            })[0];
          return bestPattern ? renderFibonacciLevels(bestPattern, 0) : null;
        })()}
      </div>

    </>
  );
};
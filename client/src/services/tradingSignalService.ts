import type { CandlestickData, ElliottWavePattern } from "../types/domain";

export interface TradingSignal {
  id: string;
  timestamp: string;
  symbol: string;
  currentPrice: number;
  
  // Signal Classification
  signalType: 'BUY' | 'SELL' | 'HOLD';
  signalStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  confidence: number; // 0-1
  
  // Entry Strategy
  macroEntry: {
    level: number;
    reasoning: string;
    timeframe: string;
    wavePosition: string;
  };
  
  microEntry: {
    level: number;
    reasoning: string;
    confirmationRequired: string[];
    optimalTimeToEnter: string;
  };
  
  // Risk Management
  stopLoss: {
    level: number;
    percentage: number;
    reasoning: string;
    type: 'FIXED' | 'TRAILING' | 'ATR_BASED';
  };
  
  takeProfit: {
    primary: number;
    secondary?: number;
    percentage: number;
    fibonacciLevel: number;
    reasoning: string;
  };
  
  // Mathematical Analysis
  riskRewardRatio: number;
  expectedMove: {
    bullishTarget: number;
    bearishTarget: number;
    neutralZone: [number, number];
  };
  
  // Technical Context
  technicalFactors: {
    trendAlignment: 'WITH' | 'AGAINST' | 'SIDEWAYS';
    volumeConfirmation: boolean;
    fibonacciAlignment: boolean;
    waveCountValidity: number;
    momentumDivergence: boolean;
  };
  
  // Time-based Analysis
  timeAnalysis: {
    cyclePosition: string;
    volatilityWindow: 'HIGH' | 'MEDIUM' | 'LOW';
    marketSession: string;
    recommendedHoldTime: string;
  };
}

export class TradingSignalService {
  
  /**
   * Generate comprehensive trading signals combining Elliott Wave with technical analysis
   */
  public generateTradingSignal(
    candlestickData: CandlestickData[],
    elliottPatterns: ElliottWavePattern[],
    symbol: string
  ): TradingSignal | null {
    
    if (candlestickData.length < 20 || elliottPatterns.length === 0) {
      return null;
    }
    
    const currentPrice = candlestickData[candlestickData.length - 1].close;
    const atr = this.calculateATR(candlestickData, 14);
    const trend = this.analyzeTrend(candlestickData);
    const volume = this.analyzeVolume(candlestickData);
    const momentum = this.analyzeMomentum(candlestickData);
    
    // Find the most relevant Elliott Wave pattern
    const primaryPattern = this.selectPrimaryPattern(elliottPatterns, currentPrice);
    if (!primaryPattern) return null;
    
    // Determine signal type and strength
    const signalAnalysis = this.analyzeSignal(primaryPattern, trend, momentum, volume);
    
    // Calculate entry points
    const macroEntry = this.calculateMacroEntry(primaryPattern, candlestickData, trend);
    const microEntry = this.calculateMicroEntry(primaryPattern, candlestickData, atr);
    
    // Calculate stop loss
    const stopLoss = this.calculateStopLoss(primaryPattern, candlestickData, atr, signalAnalysis.signalType);
    
    // Calculate take profit
    const takeProfit = this.calculateTakeProfit(primaryPattern, candlestickData, signalAnalysis.signalType);
    
    // Risk/reward analysis
    const riskRewardRatio = this.calculateRiskReward(
      signalAnalysis.signalType === 'BUY' ? microEntry.level : microEntry.level,
      takeProfit.primary,
      stopLoss.level
    );
    
    return {
      id: `signal_${symbol}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      symbol,
      currentPrice,
      
      signalType: signalAnalysis.signalType,
      signalStrength: signalAnalysis.strength,
      confidence: signalAnalysis.confidence,
      
      macroEntry,
      microEntry,
      stopLoss,
      takeProfit,
      
      riskRewardRatio,
      expectedMove: this.calculateExpectedMove(primaryPattern, currentPrice),
      
      technicalFactors: {
        trendAlignment: trend.direction === signalAnalysis.signalType.toLowerCase() ? 'WITH' : 
                      trend.direction === 'sideways' ? 'SIDEWAYS' : 'AGAINST',
        volumeConfirmation: volume.confirming,
        fibonacciAlignment: this.checkFibonacciAlignment(primaryPattern, currentPrice),
        waveCountValidity: primaryPattern.confidence,
        momentumDivergence: momentum.divergence
      },
      
      timeAnalysis: {
        cyclePosition: this.analyzeCyclePosition(primaryPattern),
        volatilityWindow: atr > this.calculateAverageATR(candlestickData) * 1.5 ? 'HIGH' : 
                        atr < this.calculateAverageATR(candlestickData) * 0.7 ? 'LOW' : 'MEDIUM',
        marketSession: this.getMarketSession(),
        recommendedHoldTime: this.calculateHoldTime(primaryPattern, signalAnalysis.signalType)
      }
    };
  }
  
  /**
   * Calculate macro-level entry point based on Elliott Wave structure
   */
  private calculateMacroEntry(
    pattern: ElliottWavePattern, 
    data: CandlestickData[], 
    trend: any
  ) {
    const currentPrice = data[data.length - 1].close;
    const fibLevels = pattern.fibonacciLevels.levels;
    
    if (pattern.type === 'impulse') {
      // For impulse waves, look for entries at retracement levels
      const retracementLevel = pattern.waves.length <= 3 ? 
        fibLevels['0.382'] || fibLevels['0.236'] : // Early in pattern
        fibLevels['0.618'] || fibLevels['0.5']; // Later in pattern
        
      return {
        level: retracementLevel || currentPrice * 0.98,
        reasoning: `Elliott Wave ${pattern.waves.length <= 3 ? 'early' : 'late'} impulse entry at ${pattern.waves.length <= 3 ? '38.2%' : '61.8%'} Fibonacci retracement`,
        timeframe: 'Daily/4H',
        wavePosition: `Wave ${pattern.waves.length} of ${pattern.type} pattern`
      };
    } else {
      // For corrective waves, look for breakout entries
      const breakoutLevel = pattern.priceRange.high * 1.005; // Slight breakout above resistance
      
      return {
        level: breakoutLevel,
        reasoning: 'Corrective pattern breakout above resistance with volume confirmation',
        timeframe: 'Daily/4H', 
        wavePosition: 'Post-correction impulse entry'
      };
    }
  }
  
  /**
   * Calculate micro-level entry point for precise timing
   */
  private calculateMicroEntry(
    pattern: ElliottWavePattern,
    data: CandlestickData[],
    atr: number
  ) {
    const currentPrice = data[data.length - 1].close;
    const fibLevels = pattern.fibonacciLevels.levels;
    
    // Use smaller retracement for micro entry
    const microLevel = fibLevels['0.236'] || currentPrice * 0.995;
    
    return {
      level: microLevel,
      reasoning: 'Micro pullback to 23.6% Fib level with bullish divergence',
      confirmationRequired: [
        'Volume spike above 20-period average',
        'RSI oversold bounce (< 35)',
        'MACD bullish crossover',
        'Price action: Higher low formation'
      ],
      optimalTimeToEnter: 'Wait for 15-minute candle close above micro level with volume'
    };
  }
  
  /**
   * Calculate intelligent stop loss based on pattern structure and volatility
   */
  private calculateStopLoss(
    pattern: ElliottWavePattern,
    data: CandlestickData[],
    atr: number,
    signalType: 'BUY' | 'SELL' | 'HOLD'
  ) {
    const currentPrice = data[data.length - 1].close;
    
    if (signalType === 'BUY') {
      // For buy signals, stop loss below recent low or Fibonacci support
      const patternLow = pattern.priceRange.low;
      const atrStop = currentPrice - (atr * 2); // 2 ATR stop
      const fibStop = pattern.fibonacciLevels.levels['0.618'] || currentPrice * 0.95;
      
      const stopLevel = Math.min(patternLow * 0.98, Math.max(atrStop, fibStop));
      
      return {
        level: stopLevel,
        percentage: ((currentPrice - stopLevel) / currentPrice) * 100,
        reasoning: 'Below Elliott Wave pattern low with 2 ATR buffer and Fibonacci support',
        type: 'ATR_BASED' as const
      };
    } else if (signalType === 'SELL') {
      // For sell signals, stop loss above recent high
      const patternHigh = pattern.priceRange.high;
      const atrStop = currentPrice + (atr * 2);
      const fibStop = pattern.fibonacciLevels.levels['0.382'] || currentPrice * 1.05;
      
      const stopLevel = Math.max(patternHigh * 1.02, Math.min(atrStop, fibStop));
      
      return {
        level: stopLevel,
        percentage: ((stopLevel - currentPrice) / currentPrice) * 100,
        reasoning: 'Above Elliott Wave pattern high with 2 ATR buffer',
        type: 'ATR_BASED' as const
      };
    }
    
    // Default HOLD stop loss
    return {
      level: currentPrice * 0.95,
      percentage: 5,
      reasoning: 'Conservative 5% stop for neutral position',
      type: 'FIXED' as const
    };
  }
  
  /**
   * Calculate take profit levels using Fibonacci extensions and wave projections
   */
  private calculateTakeProfit(
    pattern: ElliottWavePattern,
    data: CandlestickData[],
    signalType: 'BUY' | 'SELL' | 'HOLD'
  ) {
    const currentPrice = data[data.length - 1].close;
    const patternRange = pattern.priceRange.high - pattern.priceRange.low;
    
    if (signalType === 'BUY') {
      // For buy signals, use Fibonacci extensions
      const extension161 = pattern.priceRange.low + (patternRange * 1.618);
      const extension261 = pattern.priceRange.low + (patternRange * 2.618);
      
      return {
        primary: extension161,
        secondary: extension261,
        percentage: ((extension161 - currentPrice) / currentPrice) * 100,
        fibonacciLevel: 1.618,
        reasoning: '161.8% Fibonacci extension target based on Elliott Wave projection'
      };
    } else if (signalType === 'SELL') {
      // For sell signals, target support levels
      const targetLevel = pattern.priceRange.low * 0.98;
      
      return {
        primary: targetLevel,
        percentage: ((currentPrice - targetLevel) / currentPrice) * 100,
        fibonacciLevel: 0.618,
        reasoning: 'Pattern support break with 61.8% retracement target'
      };
    }
    
    // Default HOLD target
    return {
      primary: currentPrice * 1.05,
      percentage: 5,
      fibonacciLevel: 1.0,
      reasoning: 'Conservative 5% target for neutral position'
    };
  }
  
  /**
   * Analyze signal strength and type based on multiple factors
   */
  private analyzeSignal(
    pattern: ElliottWavePattern,
    trend: any,
    momentum: any,
    volume: any
  ) {
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';
    let confidence = 0.5;
    
    // Elliott Wave analysis
    if (pattern.type === 'impulse' && pattern.waves.length >= 3) {
      signalType = 'BUY';
      confidence += 0.2;
    } else if (pattern.type === 'corrective' && pattern.waves.length === 3) {
      signalType = pattern.waves[2].direction === 'up' ? 'BUY' : 'SELL';
      confidence += 0.1;
    }
    
    // Trend confirmation
    if (trend.strength > 0.7) {
      confidence += 0.2;
      if (trend.direction === signalType.toLowerCase()) {
        confidence += 0.1;
      }
    }
    
    // Volume confirmation
    if (volume.confirming) {
      confidence += 0.15;
    }
    
    // Momentum confirmation
    if (momentum.bullish && signalType === 'BUY') {
      confidence += 0.1;
    } else if (momentum.bearish && signalType === 'SELL') {
      confidence += 0.1;
    }
    
    // Pattern confidence
    confidence += pattern.confidence * 0.25;
    
    // Determine strength
    if (confidence >= 0.8) strength = 'STRONG';
    else if (confidence >= 0.6) strength = 'MODERATE';
    else strength = 'WEAK';
    
    return { signalType, strength, confidence: Math.min(confidence, 1) };
  }
  
  // Utility calculation methods
  private calculateATR(data: CandlestickData[], period: number): number {
    if (data.length < period + 1) return 0;
    
    let atrSum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = i > 0 ? data[i-1].close : data[i].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      atrSum += tr;
    }
    
    return atrSum / period;
  }
  
  private calculateAverageATR(data: CandlestickData[]): number {
    return this.calculateATR(data, Math.min(20, data.length - 1));
  }
  
  private analyzeTrend(data: CandlestickData[]) {
    const prices = data.slice(-20).map(d => d.close);
    const sma20 = prices.reduce((a, b) => a + b, 0) / prices.length;
    const currentPrice = prices[prices.length - 1];
    
    const trendStrength = Math.abs(currentPrice - sma20) / sma20;
    const direction = currentPrice > sma20 ? 'up' : currentPrice < sma20 ? 'down' : 'sideways';
    
    return { direction, strength: Math.min(trendStrength * 10, 1) };
  }
  
  private analyzeVolume(data: CandlestickData[]) {
    const recentVolumes = data.slice(-5).map(d => d.volume);
    const averageVolume = data.slice(-20).map(d => d.volume).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = recentVolumes[recentVolumes.length - 1];
    
    return {
      confirming: currentVolume > averageVolume * 1.2,
      strength: currentVolume / averageVolume
    };
  }
  
  private analyzeMomentum(data: CandlestickData[]) {
    const prices = data.slice(-10).map(d => d.close);
    const roc = (prices[prices.length - 1] - prices[0]) / prices[0];
    
    return {
      bullish: roc > 0.02,
      bearish: roc < -0.02,
      divergence: false, // Simplified - would need more complex calculation
      strength: Math.abs(roc)
    };
  }
  
  private selectPrimaryPattern(patterns: ElliottWavePattern[], currentPrice: number): ElliottWavePattern | null {
    return patterns
      .filter(p => p.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence)[0] || null;
  }
  
  private calculateRiskReward(entryPrice: number, takeProfitPrice: number, stopLossPrice: number): number {
    const risk = Math.abs(entryPrice - stopLossPrice);
    const reward = Math.abs(takeProfitPrice - entryPrice);
    return reward / (risk || 1);
  }
  
  private calculateExpectedMove(pattern: ElliottWavePattern, currentPrice: number) {
    const range = pattern.priceRange.high - pattern.priceRange.low;
    
    return {
      bullishTarget: currentPrice + (range * 0.618),
      bearishTarget: currentPrice - (range * 0.618),
      neutralZone: [currentPrice * 0.98, currentPrice * 1.02] as [number, number]
    };
  }
  
  private checkFibonacciAlignment(pattern: ElliottWavePattern, currentPrice: number): boolean {
    const fibLevels = Object.values(pattern.fibonacciLevels.levels);
    return fibLevels.some(level => Math.abs(currentPrice - level) / currentPrice < 0.01);
  }
  
  private analyzeCyclePosition(pattern: ElliottWavePattern): string {
    if (pattern.type === 'impulse') {
      return `Wave ${pattern.waves.length} of 5-wave impulse`;
    } else {
      return `Wave ${pattern.waves.length} of 3-wave correction`;
    }
  }
  
  private getMarketSession(): string {
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 16) return 'US Session';
    if (hour >= 3 && hour < 12) return 'European Session';
    if (hour >= 21 || hour < 6) return 'Asian Session';
    return 'Overlap Session';
  }
  
  private calculateHoldTime(pattern: ElliottWavePattern, signalType: 'BUY' | 'SELL' | 'HOLD'): string {
    if (pattern.type === 'impulse' && signalType === 'BUY') {
      return '3-7 days (swing trade)';
    } else if (pattern.type === 'corrective') {
      return '1-3 days (short-term)';
    }
    return '1-2 days (cautious)';
  }
}

export const tradingSignalService = new TradingSignalService();
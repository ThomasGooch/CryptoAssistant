import type { MultiTimeframeIndicatorResponse } from "../types/domain";
import { IndicatorType, Timeframe, TrendDirection } from "../types/domain";

export interface MultiTimeframeAnalysisRequest {
  symbol: string;
  timeframes: Timeframe[];
  indicatorType: IndicatorType;
  period: number;
  startTime?: string;
  endTime?: string;
}

class MultiTimeframeService {
  private readonly baseUrl =
    import.meta.env.VITE_API_BASE_URL || "https://localhost:5052/api";

  /**
   * Get multi-timeframe indicator analysis
   */
  async getMultiTimeframeAnalysis(
    request: MultiTimeframeAnalysisRequest,
  ): Promise<MultiTimeframeIndicatorResponse> {
    const params = new URLSearchParams();

    // Convert timeframe enums to string names
    const timeframeNames = request.timeframes
      .map((tf) => this.getTimeframeName(tf))
      .join(",");

    params.append("timeframes", timeframeNames);
    params.append("type", request.indicatorType.toString());
    params.append("period", request.period.toString());

    if (request.startTime) {
      params.append("startTime", request.startTime);
    }

    if (request.endTime) {
      params.append("endTime", request.endTime);
    }

    const response = await fetch(
      `${this.baseUrl}/crypto/multi-timeframe/${request.symbol}?${params.toString()}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch multi-timeframe analysis: ${response.status} ${errorText}`,
      );
    }

    return response.json();
  }

  /**
   * Convert timeframe enum to API string name
   */
  private getTimeframeName(timeframe: Timeframe): string {
    switch (timeframe) {
      case Timeframe.Minute:
        return "Minute";
      case Timeframe.FiveMinutes:
        return "FiveMinutes";
      case Timeframe.FifteenMinutes:
        return "FifteenMinutes";
      case Timeframe.Hour:
        return "Hour";
      case Timeframe.FourHours:
        return "FourHours";
      case Timeframe.Day:
        return "Day";
      case Timeframe.Week:
        return "Week";
      default:
        throw new Error(`Unknown timeframe: ${timeframe}`);
    }
  }

  /**
   * Get display name for timeframe
   */
  getTimeframeDisplayName(timeframe: Timeframe): string {
    switch (timeframe) {
      case Timeframe.Minute:
        return "1m";
      case Timeframe.FiveMinutes:
        return "5m";
      case Timeframe.FifteenMinutes:
        return "15m";
      case Timeframe.Hour:
        return "1h";
      case Timeframe.FourHours:
        return "4h";
      case Timeframe.Day:
        return "1d";
      case Timeframe.Week:
        return "1w";
      default:
        return "Unknown";
    }
  }

  /**
   * Get trend direction display info
   */
  getTrendDirectionInfo(direction: TrendDirection): {
    name: string;
    color: string;
    icon: string;
  } {
    switch (direction) {
      case TrendDirection.Bullish:
        return {
          name: "Bullish",
          color: "text-green-600",
          icon: "📈",
        };
      case TrendDirection.Bearish:
        return {
          name: "Bearish",
          color: "text-red-600",
          icon: "📉",
        };
      case TrendDirection.Neutral:
        return {
          name: "Neutral",
          color: "text-gray-600",
          icon: "➡️",
        };
      default:
        return {
          name: "Unknown",
          color: "text-gray-400",
          icon: "❓",
        };
    }
  }

  /**
   * Get confluence strength display info
   */
  getConfluenceStrengthInfo(strength: number): {
    level: string;
    color: string;
    description: string;
  } {
    const absStrength = Math.abs(strength);

    if (absStrength >= 0.8) {
      return {
        level: "Very Strong",
        color: strength > 0 ? "text-green-700" : "text-red-700",
        description: "Excellent confluence across timeframes",
      };
    } else if (absStrength >= 0.6) {
      return {
        level: "Strong",
        color: strength > 0 ? "text-green-600" : "text-red-600",
        description: "Good confluence across timeframes",
      };
    } else if (absStrength >= 0.4) {
      return {
        level: "Moderate",
        color: strength > 0 ? "text-green-500" : "text-red-500",
        description: "Some confluence across timeframes",
      };
    } else if (absStrength >= 0.2) {
      return {
        level: "Weak",
        color: "text-yellow-600",
        description: "Limited confluence across timeframes",
      };
    } else {
      return {
        level: "Very Weak",
        color: "text-gray-500",
        description: "Little to no confluence across timeframes",
      };
    }
  }

  /**
   * Get alignment score display info
   */
  getAlignmentScoreInfo(score: number): {
    level: string;
    color: string;
    description: string;
  } {
    if (score >= 0.8) {
      return {
        level: "Excellent",
        color: "text-green-700",
        description: "Indicators are highly aligned",
      };
    } else if (score >= 0.6) {
      return {
        level: "Good",
        color: "text-green-600",
        description: "Indicators show good alignment",
      };
    } else if (score >= 0.4) {
      return {
        level: "Moderate",
        color: "text-yellow-600",
        description: "Indicators show moderate alignment",
      };
    } else if (score >= 0.2) {
      return {
        level: "Poor",
        color: "text-orange-600",
        description: "Indicators show poor alignment",
      };
    } else {
      return {
        level: "Very Poor",
        color: "text-red-600",
        description: "Indicators are not aligned",
      };
    }
  }
}

export const multiTimeframeService = new MultiTimeframeService();

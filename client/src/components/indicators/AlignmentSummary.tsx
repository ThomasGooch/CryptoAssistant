import React from "react";
import type { TimeframeAlignmentResponse } from "../../types/domain";
import { multiTimeframeService } from "../../services/multiTimeframeService";

interface AlignmentSummaryProps {
  alignment: TimeframeAlignmentResponse;
}

/**
 * Component for displaying alignment summary and confluence analysis
 */
const AlignmentSummary: React.FC<AlignmentSummaryProps> = ({ alignment }) => {
  const trendInfo = multiTimeframeService.getTrendDirectionInfo(
    alignment.trendDirection,
  );
  const confluenceInfo = multiTimeframeService.getConfluenceStrengthInfo(
    alignment.confluenceStrength,
  );
  const alignmentInfo = multiTimeframeService.getAlignmentScoreInfo(
    alignment.alignmentScore,
  );

  // Create visual progress bars
  const getProgressBarColor = (value: number) => {
    if (value >= 0.8) return "bg-green-500";
    if (value >= 0.6) return "bg-green-400";
    if (value >= 0.4) return "bg-yellow-500";
    if (value >= 0.2) return "bg-orange-500";
    return "bg-red-500";
  };

  const getConfluenceBarColor = (value: number) => {
    const absValue = Math.abs(value);
    if (value > 0) {
      if (absValue >= 0.8) return "bg-green-600";
      if (absValue >= 0.6) return "bg-green-500";
      if (absValue >= 0.4) return "bg-green-400";
      return "bg-green-300";
    } else {
      if (absValue >= 0.8) return "bg-red-600";
      if (absValue >= 0.6) return "bg-red-500";
      if (absValue >= 0.4) return "bg-red-400";
      return "bg-red-300";
    }
  };

  return (
    <div className="crypto-card">
      <h3 className="text-lg font-semibold mb-4">Alignment Summary</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trend Direction */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">{trendInfo.icon}</div>
          <div className={`text-lg font-semibold ${trendInfo.color}`}>
            {trendInfo.name}
          </div>
          <div className="text-sm text-gray-600 mt-1">Overall Trend</div>
        </div>

        {/* Alignment Score */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold mb-2">
            {(alignment.alignmentScore * 100).toFixed(0)}%
          </div>
          <div className={`text-sm font-semibold ${alignmentInfo.color}`}>
            {alignmentInfo.level}
          </div>
          <div className="text-xs text-gray-600 mt-1">Alignment Score</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(alignment.alignmentScore)}`}
              style={{ width: `${alignment.alignmentScore * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Confluence Strength */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold mb-2">
            {alignment.confluenceStrength > 0 ? "+" : ""}
            {alignment.confluenceStrength.toFixed(2)}
          </div>
          <div className={`text-sm font-semibold ${confluenceInfo.color}`}>
            {confluenceInfo.level}
          </div>
          <div className="text-xs text-gray-600 mt-1">Confluence</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getConfluenceBarColor(alignment.confluenceStrength)}`}
              style={{
                width: `${Math.abs(alignment.confluenceStrength) * 100}%`,
                marginLeft:
                  alignment.confluenceStrength < 0
                    ? `${(1 - Math.abs(alignment.confluenceStrength)) * 100}%`
                    : "0",
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Strong Confluence Alert */}
      {alignment.isStrongConfluence && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 font-bold text-lg">🎯</span>
            <div>
              <div className="text-green-800 font-semibold">
                Strong Confluence Detected!
              </div>
              <div className="text-green-700 text-sm">
                This represents a high-probability setup with excellent
                alignment across timeframes.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-sm mb-2">Analysis</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div>{alignmentInfo.description}</div>
            <div>{confluenceInfo.description}</div>
          </div>
        </div>

        {(alignment.strongestTimeframe !== undefined ||
          alignment.weakestTimeframe !== undefined) && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Key Timeframes</h4>
            <div className="text-sm text-gray-700 space-y-1">
              {alignment.strongestTimeframe !== undefined && (
                <div>
                  <span className="font-medium">Strongest:</span>{" "}
                  {multiTimeframeService.getTimeframeDisplayName(
                    alignment.strongestTimeframe,
                  )}{" "}
                  💪
                </div>
              )}
              {alignment.weakestTimeframe !== undefined && (
                <div>
                  <span className="font-medium">Weakest:</span>{" "}
                  {multiTimeframeService.getTimeframeDisplayName(
                    alignment.weakestTimeframe,
                  )}{" "}
                  📉
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlignmentSummary;

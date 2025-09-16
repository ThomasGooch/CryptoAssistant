using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Analysis.MultiTimeframe;
using AkashTrends.Core.Domain;

namespace AkashTrends.API.Models;

/// <summary>
/// Response model for multi-timeframe indicator calculation
/// </summary>
public class MultiTimeframeIndicatorResponse
{
    /// <summary>
    /// The cryptocurrency symbol
    /// </summary>
    public required string Symbol { get; set; }

    /// <summary>
    /// The type of indicator calculated
    /// </summary>
    public required IndicatorType IndicatorType { get; set; }

    /// <summary>
    /// The period used for indicator calculation
    /// </summary>
    public required int Period { get; set; }

    /// <summary>
    /// Indicator results by timeframe
    /// </summary>
    public required Dictionary<Timeframe, TimeframeIndicatorResult> Results { get; set; }

    /// <summary>
    /// Timeframe alignment analysis
    /// </summary>
    public required TimeframeAlignmentResponse Alignment { get; set; }

    /// <summary>
    /// Start time of the data range used
    /// </summary>
    public required DateTimeOffset StartTime { get; set; }

    /// <summary>
    /// End time of the data range used
    /// </summary>
    public required DateTimeOffset EndTime { get; set; }
}

/// <summary>
/// Indicator result for a specific timeframe
/// </summary>
public class TimeframeIndicatorResult
{
    /// <summary>
    /// The calculated indicator value
    /// </summary>
    public required decimal Value { get; set; }

    /// <summary>
    /// Start time of the calculation period
    /// </summary>
    public required DateTimeOffset StartTime { get; set; }

    /// <summary>
    /// End time of the calculation period
    /// </summary>
    public required DateTimeOffset EndTime { get; set; }
}

/// <summary>
/// Timeframe alignment analysis response
/// </summary>
public class TimeframeAlignmentResponse
{
    /// <summary>
    /// Alignment score from 0 to 1 (1 = perfect alignment)
    /// </summary>
    public required decimal AlignmentScore { get; set; }

    /// <summary>
    /// The overall trend direction across timeframes
    /// </summary>
    public required TrendDirection TrendDirection { get; set; }

    /// <summary>
    /// Indicator values by timeframe for comparison
    /// </summary>
    public required Dictionary<Timeframe, decimal> IndicatorValues { get; set; }

    /// <summary>
    /// The strongest timeframe (highest value for bullish, lowest for bearish)
    /// </summary>
    public Timeframe? StrongestTimeframe { get; set; }

    /// <summary>
    /// The weakest timeframe (lowest value for bullish, highest for bearish)
    /// </summary>
    public Timeframe? WeakestTimeframe { get; set; }

    /// <summary>
    /// Confluence strength from -1 (perfect bearish) to +1 (perfect bullish)
    /// </summary>
    public decimal ConfluenceStrength { get; set; }

    /// <summary>
    /// Whether this represents a strong confluence setup
    /// </summary>
    public bool IsStrongConfluence { get; set; }
}
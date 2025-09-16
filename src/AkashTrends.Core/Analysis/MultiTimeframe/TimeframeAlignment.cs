namespace AkashTrends.Core.Analysis.MultiTimeframe;

/// <summary>
/// Represents the direction of a trend across multiple timeframes
/// </summary>
public enum TrendDirection
{
    /// <summary>
    /// Trend is bearish (downward)
    /// </summary>
    Bearish,
    
    /// <summary>
    /// Trend is neutral (sideways)
    /// </summary>
    Neutral,
    
    /// <summary>
    /// Trend is bullish (upward)
    /// </summary>
    Bullish
}

/// <summary>
/// Represents the alignment of indicators across multiple timeframes
/// </summary>
public class TimeframeAlignment
{
    /// <summary>
    /// Score from 0 to 1 indicating how aligned the indicators are across timeframes
    /// 1 = Perfect alignment, 0 = Complete divergence
    /// </summary>
    public decimal AlignmentScore { get; }
    
    /// <summary>
    /// The overall trend direction across all timeframes
    /// </summary>
    public TrendDirection TrendDirection { get; }
    
    /// <summary>
    /// Dictionary of individual indicator values by timeframe
    /// </summary>
    public Dictionary<Timeframe, decimal> IndicatorValues { get; }
    
    /// <summary>
    /// The strongest timeframe (highest value for bullish, lowest for bearish)
    /// </summary>
    public Timeframe? StrongestTimeframe { get; }
    
    /// <summary>
    /// The weakest timeframe (lowest value for bullish, highest for bearish)
    /// </summary>
    public Timeframe? WeakestTimeframe { get; }

    public TimeframeAlignment(
        decimal alignmentScore,
        TrendDirection trendDirection,
        Dictionary<Timeframe, decimal> indicatorValues,
        Timeframe? strongestTimeframe = null,
        Timeframe? weakestTimeframe = null)
    {
        AlignmentScore = Math.Max(0, Math.Min(1, alignmentScore)); // Ensure 0-1 range
        TrendDirection = trendDirection;
        IndicatorValues = indicatorValues ?? new Dictionary<Timeframe, decimal>();
        StrongestTimeframe = strongestTimeframe;
        WeakestTimeframe = weakestTimeframe;
    }
    
    /// <summary>
    /// Gets the confluence strength (alignment score with direction weighting)
    /// </summary>
    /// <returns>Confluence strength from -1 (perfect bearish alignment) to +1 (perfect bullish alignment)</returns>
    public decimal GetConfluenceStrength()
    {
        var directionMultiplier = TrendDirection switch
        {
            TrendDirection.Bullish => 1m,
            TrendDirection.Bearish => -1m,
            TrendDirection.Neutral => 0m,
            _ => 0m
        };
        
        return AlignmentScore * directionMultiplier;
    }
    
    /// <summary>
    /// Determines if this represents a strong confluence setup
    /// </summary>
    /// <param name="threshold">Minimum alignment score to consider strong (default 0.7)</param>
    /// <returns>True if alignment score exceeds threshold</returns>
    public bool IsStrongConfluence(decimal threshold = 0.7m)
    {
        return AlignmentScore >= threshold;
    }
}
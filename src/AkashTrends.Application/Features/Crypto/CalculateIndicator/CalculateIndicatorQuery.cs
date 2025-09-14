using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Analysis.Indicators;

namespace AkashTrends.Application.Features.Crypto.CalculateIndicator;

/// <summary>
/// Query to calculate a technical indicator for a cryptocurrency
/// </summary>
public class CalculateIndicatorQuery : IQuery<CalculateIndicatorResult>
{
    /// <summary>
    /// The symbol of the cryptocurrency (e.g., BTC, ETH)
    /// </summary>
    public required string Symbol { get; set; }

    /// <summary>
    /// The type of indicator to calculate
    /// </summary>
    public IndicatorType Type { get; set; }

    /// <summary>
    /// The period for the indicator calculation
    /// </summary>
    public int Period { get; set; }
}

/// <summary>
/// Result of the CalculateIndicatorQuery
/// </summary>
public class CalculateIndicatorResult
{
    /// <summary>
    /// The symbol of the cryptocurrency
    /// </summary>
    public required string Symbol { get; set; }

    /// <summary>
    /// The type of indicator that was calculated
    /// </summary>
    public IndicatorType Type { get; set; }

    /// <summary>
    /// The calculated indicator value
    /// </summary>
    public decimal Value { get; set; }

    /// <summary>
    /// The start time of the data used for calculation
    /// </summary>
    public DateTimeOffset StartTime { get; set; }

    /// <summary>
    /// The end time of the data used for calculation
    /// </summary>
    public DateTimeOffset EndTime { get; set; }
}

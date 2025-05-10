using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Analysis.Indicators;

namespace AkashTrends.Application.Features.Crypto.GetAvailableIndicators;

/// <summary>
/// Query to get available technical indicators
/// </summary>
public class GetAvailableIndicatorsQuery : IQuery<GetAvailableIndicatorsResult>
{
}

/// <summary>
/// Result of the GetAvailableIndicatorsQuery
/// </summary>
public class GetAvailableIndicatorsResult
{
    /// <summary>
    /// List of available indicator types
    /// </summary>
    public IReadOnlyList<IndicatorType> Indicators { get; set; } = Array.Empty<IndicatorType>();
}

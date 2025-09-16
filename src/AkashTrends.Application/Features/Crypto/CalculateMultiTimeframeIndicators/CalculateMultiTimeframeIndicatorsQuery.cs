using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;

namespace AkashTrends.Application.Features.Crypto.CalculateMultiTimeframeIndicators;

public class CalculateMultiTimeframeIndicatorsQuery : IQuery<CalculateMultiTimeframeIndicatorsResult>
{
    public required string Symbol { get; set; }
    public required IEnumerable<Timeframe> Timeframes { get; set; }
    public required IndicatorType IndicatorType { get; set; }
    public required int Period { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
}
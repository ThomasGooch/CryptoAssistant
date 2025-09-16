using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Analysis.MultiTimeframe;
using AkashTrends.Core.Domain;

namespace AkashTrends.Application.Features.Crypto.CalculateMultiTimeframeIndicators;

public class CalculateMultiTimeframeIndicatorsResult
{
    public required string Symbol { get; set; }
    public required IndicatorType IndicatorType { get; set; }
    public required int Period { get; set; }
    public required Dictionary<Timeframe, IndicatorResult> IndicatorResults { get; set; }
    public required TimeframeAlignment Alignment { get; set; }
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
}
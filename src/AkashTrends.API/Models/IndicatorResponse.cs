using AkashTrends.Core.Analysis.Indicators;

namespace AkashTrends.API.Models;

public class IndicatorResponse
{
    public string Symbol { get; set; } = string.Empty;
    public IndicatorType Type { get; set; }
    public decimal Value { get; set; }
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
}

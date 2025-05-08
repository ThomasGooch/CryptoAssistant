using AkashTrends.Core.Analysis.Indicators;

namespace AkashTrends.API.Models;

public class IndicatorTypesResponse
{
    public IEnumerable<IndicatorType> Indicators { get; set; } = Array.Empty<IndicatorType>();
}

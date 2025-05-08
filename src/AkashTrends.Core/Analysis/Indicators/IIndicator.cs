using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.Indicators;

public interface IIndicator
{
    IndicatorResult Calculate(IReadOnlyList<CryptoPrice> prices);
}

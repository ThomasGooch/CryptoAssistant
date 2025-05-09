using AkashTrends.Core.Analysis.Indicators;

namespace AkashTrends.Core.Services;

public interface IIndicatorUpdateService
{
    Task SubscribeToIndicator(string symbol, IndicatorType indicatorType, int period);
    Task UnsubscribeFromIndicator(string symbol, IndicatorType indicatorType);
    Task UpdateIndicatorsAsync();
}

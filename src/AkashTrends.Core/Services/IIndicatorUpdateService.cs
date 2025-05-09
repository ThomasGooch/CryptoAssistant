using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;

namespace AkashTrends.Core.Services;

public interface IIndicatorUpdateService
{
    Task SubscribeToIndicator(string symbol, IndicatorType indicatorType, int period);
    Task SubscribeToIndicator(string symbol, IndicatorType indicatorType, int period, Timeframe timeframe);
    Task UnsubscribeFromIndicator(string symbol, IndicatorType indicatorType);
    Task UnsubscribeFromIndicator(string symbol, IndicatorType indicatorType, Timeframe timeframe);
    Task UpdateIndicatorsAsync();
}

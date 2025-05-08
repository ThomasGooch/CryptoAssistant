namespace AkashTrends.Core.Analysis.Indicators;

public interface IIndicatorFactory
{
    IIndicator CreateIndicator(IndicatorType type, int period);
    IEnumerable<IndicatorType> GetAvailableIndicators();
    IndicatorDescription GetIndicatorDescription(IndicatorType type);
    (int MinPeriod, int MaxPeriod) GetDefaultPeriodRange(IndicatorType type);
}

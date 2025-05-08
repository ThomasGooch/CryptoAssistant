namespace AkashTrends.Core.Analysis.Indicators;

public class BollingerBandsResult : IndicatorResult
{
    public decimal UpperBand { get; }
    public decimal MiddleBand { get; }
    public decimal LowerBand { get; }

    public BollingerBandsResult(
        decimal upperBand,
        decimal middleBand,
        decimal lowerBand,
        DateTimeOffset startTime,
        DateTimeOffset endTime)
        : base(middleBand, startTime, endTime)
    {
        UpperBand = upperBand;
        MiddleBand = middleBand;
        LowerBand = lowerBand;
    }
}

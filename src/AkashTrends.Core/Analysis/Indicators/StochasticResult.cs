namespace AkashTrends.Core.Analysis.Indicators;

public class StochasticResult : IndicatorResult
{
    public StochasticResult(decimal value, DateTimeOffset startTime, DateTimeOffset endTime)
        : base(value, startTime, endTime)
    {
        if (value < 0 || value > 100)
        {
            throw new ArgumentException("Stochastic value must be between 0 and 100", nameof(value));
        }
    }
}

using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.Indicators;

public class SimpleMovingAverage : IIndicator
{
    private readonly int _period;

    public SimpleMovingAverage(int period)
    {
        if (period <= 0)
        {
            throw new ArgumentException("Period must be greater than 0", nameof(period));
        }

        _period = period;
    }

    public IndicatorResult Calculate(IReadOnlyList<CryptoPrice> prices)
    {
        if (prices == null || prices.Count < _period)
        {
            throw new ArgumentException($"Insufficient data points. Need at least {_period} prices, but got {prices?.Count ?? 0}");
        }

        // Validate prices are for the same currency
        var currency = prices[0].Currency;
        if (prices.Any(p => p.Currency != currency))
        {
            throw new ArgumentException("All prices must be for the same currency");
        }

        // Validate prices are sorted
        for (int i = 1; i < prices.Count; i++)
        {
            if (prices[i].Timestamp < prices[i - 1].Timestamp)
            {
                throw new ArgumentException("Prices must be sorted by timestamp in ascending order");
            }
        }

        var sum = prices.Take(_period).Sum(p => p.Value);
        var average = sum / _period;

        return new IndicatorResult(
            value: average,
            startTime: prices[0].Timestamp,
            endTime: prices[_period - 1].Timestamp
        );
    }
}

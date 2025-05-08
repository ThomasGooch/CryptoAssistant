using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.Indicators;

public class StochasticOscillator : IIndicator
{
    private readonly int _period;

    public StochasticOscillator(int period)
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

        // Validate prices are sorted
        for (int i = 1; i < prices.Count; i++)
        {
            if (prices[i].Timestamp < prices[i - 1].Timestamp)
            {
                throw new ArgumentException("Prices must be sorted by timestamp in ascending order");
            }
        }

        var periodPrices = prices.TakeLast(_period);
        var currentPrice = prices[^1].Value;
        var highestPrice = periodPrices.Max(p => p.Value);
        var lowestPrice = periodPrices.Min(p => p.Value);

        // Handle the case where highest equals lowest (constant price)
        if (highestPrice == lowestPrice)
        {
            return new StochasticResult(
                value: 50m, // Middle of the range
                startTime: prices[^_period].Timestamp,
                endTime: prices[^1].Timestamp
            );
        }

        // Calculate %K
        var stochastic = ((currentPrice - lowestPrice) / (highestPrice - lowestPrice)) * 100m;

        return new StochasticResult(
            value: stochastic,
            startTime: prices[^_period].Timestamp,
            endTime: prices[^1].Timestamp
        );
    }
}

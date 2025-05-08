using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.Indicators;

public class RelativeStrengthIndex : IIndicator
{
    private readonly int _period;

    public RelativeStrengthIndex(int period)
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

        // Calculate price changes
        var priceChanges = new List<decimal>();
        for (int i = 1; i < prices.Count; i++)
        {
            priceChanges.Add(prices[i].Value - prices[i - 1].Value);
        }

        // Calculate average gains and losses
        var gains = priceChanges.Where(c => c > 0).DefaultIfEmpty(0).Take(_period);
        var losses = priceChanges.Where(c => c < 0).Select(Math.Abs).DefaultIfEmpty(0).Take(_period);

        var avgGain = gains.Sum() / _period;
        var avgLoss = losses.Sum() / _period;

        // Calculate RSI
        decimal rsi;
        if (avgLoss == 0)
        {
            rsi = avgGain == 0 ? 50m : 100m;
        }
        else
        {
            var rs = avgGain / avgLoss;
            rsi = 100m - (100m / (1m + rs));
        }

        return new IndicatorResult(
            value: rsi,
            startTime: prices[0].Timestamp,
            endTime: prices[^1].Timestamp
        );
    }
}

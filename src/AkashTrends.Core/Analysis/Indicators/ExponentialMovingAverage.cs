using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.Indicators;

public class ExponentialMovingAverage : IIndicator
{
    private readonly int _period;
    private readonly decimal _multiplier;

    public ExponentialMovingAverage(int period)
    {
        if (period <= 0)
        {
            throw new ArgumentException("Period must be greater than 0", nameof(period));
        }

        _period = period;
        _multiplier = 2m / (period + 1);
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

        // For period of 1, just return the price
        if (_period == 1)
        {
            return new IndicatorResult(
                value: prices[0].Value,
                startTime: prices[0].Timestamp,
                endTime: prices[0].Timestamp
            );
        }

        // Calculate initial SMA
        var sma = new SimpleMovingAverage(_period);
        var initialEma = sma.Calculate(prices.Take(_period).ToList());

        // Calculate EMA
        var ema = initialEma.Value;
        for (int i = _period; i < prices.Count; i++)
        {
            var price = prices[i].Value;
            ema = price * _multiplier + ema * (1 - _multiplier);
        }

        return new IndicatorResult(
            value: ema,
            startTime: prices[0].Timestamp,
            endTime: prices[^1].Timestamp
        );
    }
}

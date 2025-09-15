using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.Indicators;

/// <summary>
/// Williams %R indicator
/// A momentum oscillator that measures overbought and oversold levels
/// </summary>
public class WilliamsPercentR : IIndicator
{
    private readonly int _period;

    /// <summary>
    /// Creates a new Williams %R indicator with the specified lookback period
    /// </summary>
    /// <param name="period">The lookback period (typically 14)</param>
    public WilliamsPercentR(int period)
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

        // For Williams %R, we need high, low, and close prices
        // Since we only have one price value, we'll use it as the close price
        // and estimate high/low based on recent price movements
        var recentPrices = prices.TakeLast(_period).ToList();

        // Find highest high and lowest low in the period
        var highestHigh = recentPrices.Max(p => p.Value);
        var lowestLow = recentPrices.Min(p => p.Value);
        var currentClose = prices[^1].Value;

        // Calculate Williams %R
        // Formula: %R = (Highest High - Current Close) / (Highest High - Lowest Low) * -100
        decimal williamsR;

        if (highestHigh == lowestLow)
        {
            // If there's no range, return -50 (neutral)
            williamsR = -50m;
        }
        else
        {
            williamsR = (highestHigh - currentClose) / (highestHigh - lowestLow) * -100m;
        }

        // Ensure Williams %R is between -100 and 0
        williamsR = Math.Max(-100m, Math.Min(0m, williamsR));

        return new IndicatorResult(
            value: williamsR,
            startTime: prices[0].Timestamp,
            endTime: prices[^1].Timestamp
        );
    }
}
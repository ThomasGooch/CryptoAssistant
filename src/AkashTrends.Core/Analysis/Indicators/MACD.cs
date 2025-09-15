using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.Indicators;

/// <summary>
/// MACD (Moving Average Convergence Divergence) indicator
/// Calculates the difference between a fast EMA and slow EMA, along with a signal line and histogram
/// </summary>
public class MACD : IIndicator
{
    private readonly int _fastPeriod;
    private readonly int _slowPeriod;
    private readonly int _signalPeriod;

    /// <summary>
    /// Creates a new MACD indicator with specified periods
    /// </summary>
    /// <param name="fastPeriod">Fast EMA period (typically 12)</param>
    /// <param name="slowPeriod">Slow EMA period (typically 26)</param>
    /// <param name="signalPeriod">Signal line EMA period (typically 9)</param>
    public MACD(int fastPeriod = 12, int slowPeriod = 26, int signalPeriod = 9)
    {
        if (fastPeriod <= 0)
            throw new ArgumentException("Fast period must be greater than 0", nameof(fastPeriod));
        if (slowPeriod <= 0)
            throw new ArgumentException("Slow period must be greater than 0", nameof(slowPeriod));
        if (signalPeriod <= 0)
            throw new ArgumentException("Signal period must be greater than 0", nameof(signalPeriod));
        if (fastPeriod >= slowPeriod)
            throw new ArgumentException("Fast period must be less than slow period");

        _fastPeriod = fastPeriod;
        _slowPeriod = slowPeriod;
        _signalPeriod = signalPeriod;
    }

    public IndicatorResult Calculate(IReadOnlyList<CryptoPrice> prices)
    {
        if (prices == null || prices.Count < _slowPeriod + _signalPeriod)
        {
            throw new ArgumentException(
                $"Insufficient data points. Need at least {_slowPeriod + _signalPeriod} prices, but got {prices?.Count ?? 0}");
        }

        // Validate prices are sorted
        for (int i = 1; i < prices.Count; i++)
        {
            if (prices[i].Timestamp < prices[i - 1].Timestamp)
            {
                throw new ArgumentException("Prices must be sorted by timestamp in ascending order");
            }
        }

        // Calculate fast and slow EMAs
        var fastEMA = CalculateEMA(prices, _fastPeriod);
        var slowEMA = CalculateEMA(prices, _slowPeriod);

        // Calculate MACD line (fast EMA - slow EMA)
        var macdValues = new List<(decimal value, DateTimeOffset timestamp)>();
        var startIndex = _slowPeriod - 1; // Start from where slow EMA is available

        for (int i = startIndex; i < prices.Count; i++)
        {
            var macdValue = fastEMA[i] - slowEMA[i];
            macdValues.Add((macdValue, prices[i].Timestamp));
        }

        // Calculate signal line (EMA of MACD line)
        var signalLine = CalculateEMAFromValues(macdValues, _signalPeriod);

        // Get the final MACD line value and signal line value
        var finalMACDValue = macdValues[^1].value;
        var finalSignalValue = signalLine[^1];

        // Calculate histogram (MACD line - signal line)
        var histogram = finalMACDValue - finalSignalValue;

        return new MACDResult(
            macdLine: finalMACDValue,
            signalLine: finalSignalValue,
            histogram: histogram,
            fastPeriod: _fastPeriod,
            slowPeriod: _slowPeriod,
            signalPeriod: _signalPeriod,
            startTime: prices[0].Timestamp,
            endTime: prices[^1].Timestamp
        );
    }

    /// <summary>
    /// Calculates EMA for the given prices and period
    /// </summary>
    private decimal[] CalculateEMA(IReadOnlyList<CryptoPrice> prices, int period)
    {
        var ema = new decimal[prices.Count];
        var multiplier = 2m / (period + 1);

        // Initialize first EMA value with SMA
        var sum = 0m;
        for (int i = 0; i < period; i++)
        {
            sum += prices[i].Value;
        }
        ema[period - 1] = sum / period;

        // Calculate EMA for the rest
        for (int i = period; i < prices.Count; i++)
        {
            ema[i] = (prices[i].Value - ema[i - 1]) * multiplier + ema[i - 1];
        }

        // Fill earlier values with the first calculated EMA for consistency
        for (int i = 0; i < period - 1; i++)
        {
            ema[i] = ema[period - 1];
        }

        return ema;
    }

    /// <summary>
    /// Calculates EMA from a list of values with timestamps
    /// </summary>
    private decimal[] CalculateEMAFromValues(List<(decimal value, DateTimeOffset timestamp)> values, int period)
    {
        var ema = new decimal[values.Count];
        var multiplier = 2m / (period + 1);

        // Initialize first EMA value with SMA
        var sum = 0m;
        for (int i = 0; i < Math.Min(period, values.Count); i++)
        {
            sum += values[i].value;
        }
        ema[Math.Min(period, values.Count) - 1] = sum / Math.Min(period, values.Count);

        // Calculate EMA for the rest
        for (int i = period; i < values.Count; i++)
        {
            ema[i] = (values[i].value - ema[i - 1]) * multiplier + ema[i - 1];
        }

        // Fill earlier values with the first calculated EMA for consistency
        for (int i = 0; i < Math.Min(period - 1, values.Count); i++)
        {
            ema[i] = ema[Math.Min(period - 1, values.Count - 1)];
        }

        return ema;
    }
}
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.MultiTimeframe;

/// <summary>
/// Service for calculating indicators across multiple timeframes and analyzing their alignment
/// </summary>
public interface IMultiTimeframeIndicatorService
{
    /// <summary>
    /// Calculates the same indicator across multiple timeframes
    /// </summary>
    /// <param name="symbol">The symbol to calculate indicators for</param>
    /// <param name="sourceData">Source candlestick data (typically 1-minute)</param>
    /// <param name="targetTimeframes">Timeframes to calculate indicators for</param>
    /// <param name="indicatorType">Type of indicator to calculate</param>
    /// <param name="period">Indicator period</param>
    /// <returns>Dictionary mapping timeframes to their indicator results</returns>
    Dictionary<Timeframe, IndicatorResult> CalculateMultiTimeframeIndicators(
        string symbol,
        IEnumerable<CandlestickData> sourceData,
        IEnumerable<Timeframe> targetTimeframes,
        IndicatorType indicatorType,
        int period);

    /// <summary>
    /// Analyzes the alignment of indicator values across multiple timeframes
    /// </summary>
    /// <param name="timeframeResults">Indicator results by timeframe</param>
    /// <returns>TimeframeAlignment analysis</returns>
    TimeframeAlignment GetTimeframeAlignment(Dictionary<Timeframe, IndicatorResult> timeframeResults);
}

public class MultiTimeframeIndicatorService : IMultiTimeframeIndicatorService
{
    private readonly ITimeframeConverter _timeframeConverter;
    private readonly IIndicatorFactory _indicatorFactory;

    public MultiTimeframeIndicatorService(
        ITimeframeConverter timeframeConverter,
        IIndicatorFactory indicatorFactory)
    {
        _timeframeConverter = timeframeConverter ?? throw new ArgumentNullException(nameof(timeframeConverter));
        _indicatorFactory = indicatorFactory ?? throw new ArgumentNullException(nameof(indicatorFactory));
    }

    public Dictionary<Timeframe, IndicatorResult> CalculateMultiTimeframeIndicators(
        string symbol,
        IEnumerable<CandlestickData> sourceData,
        IEnumerable<Timeframe> targetTimeframes,
        IndicatorType indicatorType,
        int period)
    {
        var results = new Dictionary<Timeframe, IndicatorResult>();
        var sourceDataList = sourceData?.ToList() ?? new List<CandlestickData>();
        var timeframesList = targetTimeframes?.ToList() ?? new List<Timeframe>();

        if (!sourceDataList.Any() || !timeframesList.Any())
        {
            return results;
        }

        var indicator = _indicatorFactory.CreateIndicator(indicatorType, period);

        foreach (var timeframe in timeframesList)
        {
            try
            {
                // Convert data to target timeframe
                var timeframeData = _timeframeConverter.AggregateToTimeframe(sourceDataList, timeframe);
                var timeframeDataList = timeframeData.ToList();

                if (!timeframeDataList.Any())
                {
                    continue;
                }

                // Convert candlestick data to crypto prices for the indicator
                var currency = CryptoCurrency.Create(symbol);
                var cryptoPrices = timeframeDataList.Select(c =>
                    CryptoPrice.Create(currency, c.Close, c.Timestamp)).ToList();

                // Calculate indicator for this timeframe
                var result = indicator.Calculate(cryptoPrices);

                if (result != null)
                {
                    results[timeframe] = result;
                }
            }
            catch (Exception)
            {
                // Log error and continue with other timeframes
                // For now, we'll just skip this timeframe
                continue;
            }
        }

        return results;
    }

    public TimeframeAlignment GetTimeframeAlignment(Dictionary<Timeframe, IndicatorResult> timeframeResults)
    {
        if (timeframeResults == null || !timeframeResults.Any())
        {
            return new TimeframeAlignment(0m, TrendDirection.Neutral, new Dictionary<Timeframe, decimal>());
        }

        var values = timeframeResults.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.Value);
        var sortedByTimeframe = values.OrderBy(kvp => GetTimeframeOrder(kvp.Key)).ToList();
        var indicatorValues = sortedByTimeframe.Select(kvp => kvp.Value).ToList();

        // Calculate alignment score based on value consistency
        var alignmentScore = CalculateAlignmentScore(indicatorValues);

        // Determine trend direction
        var trendDirection = DetermineTrendDirection(indicatorValues);

        // Find strongest and weakest timeframes
        var strongestTimeframe = GetStrongestTimeframe(values, trendDirection);
        var weakestTimeframe = GetWeakestTimeframe(values, trendDirection);

        return new TimeframeAlignment(
            alignmentScore,
            trendDirection,
            values,
            strongestTimeframe,
            weakestTimeframe);
    }

    private decimal CalculateAlignmentScore(IList<decimal> values)
    {
        if (values.Count <= 1)
        {
            return 1m; // Perfect alignment with only one value
        }

        var mean = values.Average();
        var variance = values.Sum(v => (v - mean) * (v - mean)) / values.Count;
        var standardDeviation = (decimal)Math.Sqrt((double)variance);

        // Normalize standard deviation to 0-1 scale
        // Lower standard deviation = higher alignment
        var maxExpectedDeviation = mean * 0.2m; // 20% of mean as maximum expected deviation
        var normalizedDeviation = Math.Min(standardDeviation / maxExpectedDeviation, 1m);

        return Math.Max(0m, 1m - normalizedDeviation);
    }

    private TrendDirection DetermineTrendDirection(IList<decimal> values)
    {
        if (values.Count <= 1)
        {
            return TrendDirection.Neutral;
        }

        var first = values[0];
        var last = values[values.Count - 1];
        var difference = last - first;
        var percentChange = Math.Abs(difference) / first;

        // Require at least 5% change to consider it a trend
        var trendThreshold = 0.05m;

        if (percentChange < trendThreshold)
        {
            return TrendDirection.Neutral;
        }

        return difference > 0 ? TrendDirection.Bullish : TrendDirection.Bearish;
    }

    private Timeframe? GetStrongestTimeframe(Dictionary<Timeframe, decimal> values, TrendDirection trendDirection)
    {
        if (!values.Any())
        {
            return null;
        }

        return trendDirection switch
        {
            TrendDirection.Bullish => values.OrderByDescending(kvp => kvp.Value).First().Key,
            TrendDirection.Bearish => values.OrderBy(kvp => kvp.Value).First().Key,
            _ => null
        };
    }

    private Timeframe? GetWeakestTimeframe(Dictionary<Timeframe, decimal> values, TrendDirection trendDirection)
    {
        if (!values.Any())
        {
            return null;
        }

        return trendDirection switch
        {
            TrendDirection.Bullish => values.OrderBy(kvp => kvp.Value).First().Key,
            TrendDirection.Bearish => values.OrderByDescending(kvp => kvp.Value).First().Key,
            _ => null
        };
    }

    private int GetTimeframeOrder(Timeframe timeframe)
    {
        return timeframe switch
        {
            Timeframe.Minute => 1,
            Timeframe.FiveMinutes => 5,
            Timeframe.FifteenMinutes => 15,
            Timeframe.Hour => 60,
            Timeframe.FourHours => 240,
            Timeframe.Day => 1440,
            Timeframe.Week => 10080,
            _ => int.MaxValue
        };
    }
}
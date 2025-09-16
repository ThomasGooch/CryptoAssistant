using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.MultiTimeframe;

/// <summary>
/// Converts price data between different timeframes (1m -> 5m -> 1h -> 1d)
/// </summary>
public interface ITimeframeConverter
{
    /// <summary>
    /// Aggregates price data to a higher timeframe
    /// </summary>
    /// <param name="sourceData">Source price data in lower timeframe</param>
    /// <param name="targetTimeframe">Target timeframe to aggregate to</param>
    /// <returns>Aggregated price data</returns>
    IEnumerable<CandlestickData> AggregateToTimeframe(
        IEnumerable<CandlestickData> sourceData,
        Timeframe targetTimeframe);

    /// <summary>
    /// Validates that source data can be converted to target timeframe
    /// </summary>
    /// <param name="sourceTimeframe">Source timeframe</param>
    /// <param name="targetTimeframe">Target timeframe</param>
    /// <returns>True if conversion is valid</returns>
    bool CanConvert(Timeframe sourceTimeframe, Timeframe targetTimeframe);
}

public class TimeframeConverter : ITimeframeConverter
{
    public IEnumerable<CandlestickData> AggregateToTimeframe(
        IEnumerable<CandlestickData> sourceData,
        Timeframe targetTimeframe)
    {
        if (!sourceData.Any())
            return Enumerable.Empty<CandlestickData>();

        var sortedData = sourceData.OrderBy(x => x.Timestamp).ToList();
        var aggregatedData = new List<CandlestickData>();
        var intervalMinutes = GetTimeframeInMinutes(targetTimeframe);

        var groups = GroupByTimeframe(sortedData, intervalMinutes);

        foreach (var group in groups)
        {
            var candles = group.OrderBy(x => x.Timestamp).ToList();
            if (!candles.Any()) continue;

            var aggregatedCandle = CandlestickData.Create(
                timestamp: candles.First().Timestamp,
                open: candles.First().Open,
                high: candles.Max(x => x.High),
                low: candles.Min(x => x.Low),
                close: candles.Last().Close,
                volume: candles.Sum(x => x.Volume)
            );

            aggregatedData.Add(aggregatedCandle);
        }

        return aggregatedData.OrderBy(x => x.Timestamp);
    }

    public bool CanConvert(Timeframe sourceTimeframe, Timeframe targetTimeframe)
    {
        var sourceMinutes = GetTimeframeInMinutes(sourceTimeframe);
        var targetMinutes = GetTimeframeInMinutes(targetTimeframe);

        // Can only convert to higher timeframes (more minutes)
        // and target must be evenly divisible by source
        return targetMinutes > sourceMinutes && targetMinutes % sourceMinutes == 0;
    }

    private IEnumerable<IGrouping<DateTimeOffset, CandlestickData>> GroupByTimeframe(
        IList<CandlestickData> data,
        int intervalMinutes)
    {
        return data.GroupBy(x => GetTimeframeStartTime(x.Timestamp, intervalMinutes));
    }

    private DateTimeOffset GetTimeframeStartTime(DateTimeOffset timestamp, int intervalMinutes)
    {
        var totalMinutes = timestamp.Hour * 60 + timestamp.Minute;
        var intervalStart = (totalMinutes / intervalMinutes) * intervalMinutes;

        return new DateTimeOffset(
            timestamp.Year,
            timestamp.Month,
            timestamp.Day,
            intervalStart / 60,
            intervalStart % 60,
            0,
            timestamp.Offset);
    }

    private int GetTimeframeInMinutes(Timeframe timeframe)
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
            _ => throw new ArgumentException($"Unsupported timeframe: {timeframe}")
        };
    }
}
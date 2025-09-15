namespace AkashTrends.Core.Analysis.Indicators;

/// <summary>
/// Represents the result of a MACD (Moving Average Convergence Divergence) calculation
/// </summary>
public class MACDResult : IndicatorResult
{
    /// <summary>
    /// The MACD line (difference between fast and slow EMA)
    /// </summary>
    public decimal MACDLine { get; }

    /// <summary>
    /// The signal line (EMA of MACD line)
    /// </summary>
    public decimal SignalLine { get; }

    /// <summary>
    /// The histogram (difference between MACD line and signal line)
    /// </summary>
    public decimal Histogram { get; }

    /// <summary>
    /// The fast EMA period used in calculation
    /// </summary>
    public int FastPeriod { get; }

    /// <summary>
    /// The slow EMA period used in calculation
    /// </summary>
    public int SlowPeriod { get; }

    /// <summary>
    /// The signal period used in calculation
    /// </summary>
    public int SignalPeriod { get; }

    public MACDResult(
        decimal macdLine,
        decimal signalLine,
        decimal histogram,
        int fastPeriod,
        int slowPeriod,
        int signalPeriod,
        DateTimeOffset startTime,
        DateTimeOffset endTime)
        : base(macdLine, startTime, endTime) // MACD line as the primary value
    {
        MACDLine = macdLine;
        SignalLine = signalLine;
        Histogram = histogram;
        FastPeriod = fastPeriod;
        SlowPeriod = slowPeriod;
        SignalPeriod = signalPeriod;
    }
}
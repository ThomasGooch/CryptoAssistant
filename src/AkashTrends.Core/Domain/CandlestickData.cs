namespace AkashTrends.Core.Domain;

/// <summary>
/// Represents OHLC (Open, High, Low, Close) candlestick data for a specific time period
/// </summary>
public class CandlestickData
{
    public DateTimeOffset Timestamp { get; private set; }
    public decimal Open { get; private set; }
    public decimal High { get; private set; }
    public decimal Low { get; private set; }
    public decimal Close { get; private set; }
    public decimal Volume { get; private set; }

    /// <summary>
    /// Indicates if the candlestick is bullish (close > open)
    /// </summary>
    public bool IsBullish => Close > Open;

    /// <summary>
    /// Indicates if the candlestick is a doji (close equals open)
    /// </summary>
    public bool IsDoji => Close == Open;

    /// <summary>
    /// The size of the candlestick body (absolute difference between open and close)
    /// </summary>
    public decimal BodySize => Math.Abs(Close - Open);

    /// <summary>
    /// The length of the upper shadow (wick above the body)
    /// </summary>
    public decimal UpperShadow => High - Math.Max(Open, Close);

    /// <summary>
    /// The length of the lower shadow (wick below the body)
    /// </summary>
    public decimal LowerShadow => Math.Min(Open, Close) - Low;

    /// <summary>
    /// The total range of the candlestick (high - low)
    /// </summary>
    public decimal TotalRange => High - Low;

    private CandlestickData(DateTimeOffset timestamp, decimal open, decimal high, decimal low, decimal close, decimal volume)
    {
        Timestamp = timestamp;
        Open = open;
        High = high;
        Low = low;
        Close = close;
        Volume = volume;
    }

    /// <summary>
    /// Creates a new candlestick data instance with validation
    /// </summary>
    /// <param name="timestamp">The timestamp for this candlestick</param>
    /// <param name="open">The opening price</param>
    /// <param name="high">The highest price during the period</param>
    /// <param name="low">The lowest price during the period</param>
    /// <param name="close">The closing price</param>
    /// <param name="volume">The trading volume during the period</param>
    /// <returns>A validated CandlestickData instance</returns>
    /// <exception cref="ArgumentException">Thrown when OHLC values are invalid</exception>
    public static CandlestickData Create(DateTimeOffset timestamp, decimal open, decimal high, decimal low, decimal close, decimal volume)
    {
        // Validate volume
        if (volume <= 0)
        {
            throw new ArgumentException("Volume must be greater than zero", nameof(volume));
        }

        // Validate high/low relationship
        if (high < low)
        {
            throw new ArgumentException("High price must be greater than or equal to low price", nameof(high));
        }

        // Validate open is within range
        if (open > high || open < low)
        {
            throw new ArgumentException("Open price must be within high-low range", nameof(open));
        }

        // Validate close is within range
        if (close > high || close < low)
        {
            throw new ArgumentException("Close price must be within high-low range", nameof(close));
        }

        return new CandlestickData(timestamp, open, high, low, close, volume);
    }

    public override bool Equals(object? obj)
    {
        if (obj is not CandlestickData other) return false;

        return Timestamp == other.Timestamp &&
               Open == other.Open &&
               High == other.High &&
               Low == other.Low &&
               Close == other.Close &&
               Volume == other.Volume;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Timestamp, Open, High, Low, Close, Volume);
    }
}
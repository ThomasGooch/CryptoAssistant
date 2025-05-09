namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class HistoricalPriceData
{
    // [timestamp, low, high, open, close, volume]
    public string Time { get; set; } = string.Empty;
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public decimal Volume { get; set; }

    public static HistoricalPriceData FromCandle(decimal[] candle)
    {
        if (candle == null || candle.Length < 6)
            throw new ArgumentException("Invalid candle data", nameof(candle));

        return new HistoricalPriceData
        {
            Time = DateTimeOffset.FromUnixTimeSeconds((long)candle[0]).ToString("O"),
            Low = candle[1],
            High = candle[2],
            Open = candle[3],
            Close = candle[4],
            Volume = candle[5]
        };
    }
}

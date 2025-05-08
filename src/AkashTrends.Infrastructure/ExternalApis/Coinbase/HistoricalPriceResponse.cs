using System.Text.Json.Serialization;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class HistoricalPriceResponse
{
    // Coinbase Exchange API candle format: [timestamp, low, high, open, close, volume]
    [JsonPropertyName("data")]
    public decimal[][] Data { get; set; } = Array.Empty<decimal[]>();

    public IEnumerable<HistoricalPriceData> ToHistoricalPriceData()
    {
        if (Data == null) return Enumerable.Empty<HistoricalPriceData>();

        return Data.Select(candle =>
        {
            if (candle == null || candle.Length < 6) return null;

            return new HistoricalPriceData
            {
                Time = DateTimeOffset.FromUnixTimeSeconds((long)candle[0]).ToString("O"),
                Price = candle[4].ToString("F2"), // Close price
                Open = candle[3],
                High = candle[2],
                Low = candle[1],
                Volume = candle[5]
            };
        }).Where(x => x != null)!;
    }
}

public class HistoricalPriceData
{
    public string Time { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Volume { get; set; }
}

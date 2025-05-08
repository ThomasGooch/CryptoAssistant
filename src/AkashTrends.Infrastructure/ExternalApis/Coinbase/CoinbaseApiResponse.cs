using System.Text.Json.Serialization;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class CoinbaseApiResponse
{
    [JsonPropertyName("price")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal Price { get; set; }

    [JsonPropertyName("size")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal Size { get; set; }

    [JsonPropertyName("time")]
    public DateTimeOffset Time { get; set; }

    [JsonPropertyName("bid")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal Bid { get; set; }

    [JsonPropertyName("ask")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal Ask { get; set; }

    [JsonPropertyName("volume")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal Volume { get; set; }

    public CoinbasePriceData ToData() => new()
    {
        Price = Price,
        Currency = "USD",
        Timestamp = Time
    };
}

public class CoinbasePriceData
{
    public decimal Price { get; set; }
    public string Currency { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
}

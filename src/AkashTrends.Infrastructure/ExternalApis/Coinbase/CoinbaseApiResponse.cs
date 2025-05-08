using System.Text.Json.Serialization;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class CoinbaseApiResponse
{
    [JsonPropertyName("data")]
    public CoinbasePriceData Data { get; set; } = new();
}

public class CoinbasePriceData
{
    [JsonPropertyName("amount")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal Price { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTimeOffset Timestamp { get; set; }
}

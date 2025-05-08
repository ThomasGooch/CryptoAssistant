using System.Text.Json.Serialization;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class HistoricalPriceResponse
{
    [JsonPropertyName("data")]
    public HistoricalPriceData[] Data { get; set; } = Array.Empty<HistoricalPriceData>();
}

public class HistoricalPriceData
{
    [JsonPropertyName("price")]
    public string Price { get; set; } = string.Empty;

    [JsonPropertyName("time")]
    public string Time { get; set; } = string.Empty;
}

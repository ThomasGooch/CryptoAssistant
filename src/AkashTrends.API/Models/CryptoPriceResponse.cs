namespace AkashTrends.API.Models;

public class CryptoPriceResponse
{
    public string Symbol { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTimeOffset Timestamp { get; set; }
}

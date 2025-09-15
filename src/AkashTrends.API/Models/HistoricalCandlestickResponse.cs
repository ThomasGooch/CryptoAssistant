namespace AkashTrends.API.Models;

public class HistoricalCandlestickResponse
{
    public string Symbol { get; set; } = string.Empty;
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
    public List<CandlestickDataResponse> Data { get; set; } = new();
}
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Domain;

namespace AkashTrends.Application.Features.Crypto.GetHistoricalCandlestickData;

/// <summary>
/// Query to get historical candlestick data for a cryptocurrency
/// </summary>
public class GetHistoricalCandlestickDataQuery : IQuery<GetHistoricalCandlestickDataResult>
{
    /// <summary>
    /// The symbol of the cryptocurrency (e.g., BTC, ETH)
    /// </summary>
    public required string Symbol { get; set; }

    /// <summary>
    /// The start time for the historical data
    /// </summary>
    public DateTimeOffset StartTime { get; set; }

    /// <summary>
    /// The end time for the historical data
    /// </summary>
    public DateTimeOffset EndTime { get; set; }
}

/// <summary>
/// Result of the GetHistoricalCandlestickDataQuery
/// </summary>
public class GetHistoricalCandlestickDataResult
{
    /// <summary>
    /// The symbol of the cryptocurrency
    /// </summary>
    public required string Symbol { get; set; }

    /// <summary>
    /// The start time of the historical data
    /// </summary>
    public DateTimeOffset StartTime { get; set; }

    /// <summary>
    /// The end time of the historical data
    /// </summary>
    public DateTimeOffset EndTime { get; set; }

    /// <summary>
    /// The list of historical candlestick data
    /// </summary>
    public List<CandlestickData> Data { get; set; } = new List<CandlestickData>();
}
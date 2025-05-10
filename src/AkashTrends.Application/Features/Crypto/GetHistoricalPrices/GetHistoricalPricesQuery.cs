using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Crypto.GetHistoricalPrices;

/// <summary>
/// Query to get historical prices for a cryptocurrency
/// </summary>
public class GetHistoricalPricesQuery : IQuery<GetHistoricalPricesResult>
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
/// Result of the GetHistoricalPricesQuery
/// </summary>
public class GetHistoricalPricesResult
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
    /// The list of historical prices
    /// </summary>
    public List<PricePoint> Prices { get; set; } = new List<PricePoint>();
}

/// <summary>
/// Represents a single price point with timestamp
/// </summary>
public class PricePoint
{
    /// <summary>
    /// The price value
    /// </summary>
    public decimal Price { get; set; }
    
    /// <summary>
    /// The timestamp of the price
    /// </summary>
    public DateTimeOffset Timestamp { get; set; }
}

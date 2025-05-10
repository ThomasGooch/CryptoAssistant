using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Crypto.GetCurrentPrice;

/// <summary>
/// Query to get the current price of a cryptocurrency
/// </summary>
public class GetCurrentPriceQuery : IQuery<GetCurrentPriceResult>
{
    /// <summary>
    /// The symbol of the cryptocurrency (e.g., BTC, ETH)
    /// </summary>
    public required string Symbol { get; set; }
}

/// <summary>
/// Result of the GetCurrentPriceQuery
/// </summary>
public class GetCurrentPriceResult
{
    /// <summary>
    /// The symbol of the cryptocurrency
    /// </summary>
    public required string Symbol { get; set; }
    
    /// <summary>
    /// The current price of the cryptocurrency
    /// </summary>
    public decimal Price { get; set; }
    
    /// <summary>
    /// The timestamp when the price was retrieved
    /// </summary>
    public DateTimeOffset Timestamp { get; set; }
}

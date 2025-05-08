using AkashTrends.Core.Domain;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public interface ICoinbaseApiClient
{
    /// <summary>
    /// Gets the current price for a cryptocurrency
    /// </summary>
    /// <param name="symbol">The cryptocurrency symbol</param>
    /// <returns>The price response from Coinbase</returns>
    Task<CoinbasePriceData> GetPriceAsync(string symbol);

    /// <summary>
    /// Gets historical prices for a cryptocurrency
    /// </summary>
    /// <param name="symbol">The cryptocurrency symbol</param>
    /// <param name="startTime">Start time for historical data</param>
    /// <param name="endTime">End time for historical data</param>
    /// <returns>List of historical prices</returns>
    Task<IReadOnlyList<CryptoPrice>> GetHistoricalPricesAsync(string symbol, DateTimeOffset startTime, DateTimeOffset endTime);
}

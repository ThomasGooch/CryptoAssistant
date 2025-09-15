using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Services;

public interface ICryptoExchangeService
{
    Task<CryptoPrice> GetCurrentPriceAsync(string symbol);
    Task<IReadOnlyList<CryptoPrice>> GetHistoricalPricesAsync(string symbol, DateTimeOffset startTime, DateTimeOffset endTime);
    Task<IReadOnlyList<CandlestickData>> GetHistoricalCandlestickDataAsync(string symbol, DateTimeOffset startTime, DateTimeOffset endTime);
}

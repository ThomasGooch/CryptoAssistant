using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;

namespace AkashTrends.Infrastructure.Services;

/// <summary>
/// Decorator for ICryptoExchangeService that adds caching capabilities
/// </summary>
public class CachedCryptoExchangeService : ICryptoExchangeService
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly ICacheService _cacheService;
    private readonly ITimeProvider _timeProvider;
    private const int HISTORICAL_CACHE_MINUTES = 60; // Cache historical data for 1 hour

    public CachedCryptoExchangeService(
        ICryptoExchangeService exchangeService,
        ICacheService cacheService,
        ITimeProvider timeProvider)
    {
        _exchangeService = exchangeService ?? throw new ArgumentNullException(nameof(exchangeService));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    }

    public async Task<CryptoPrice> GetCurrentPriceAsync(string symbol)
    {
        // Don't cache current price as it needs to be real-time
        return await _exchangeService.GetCurrentPriceAsync(symbol);
    }

    public async Task<IReadOnlyList<CryptoPrice>> GetHistoricalPricesAsync(
        string symbol,
        DateTimeOffset startTime,
        DateTimeOffset endTime)
    {
        if (startTime >= endTime)
        {
            throw new ArgumentException("Start time must be before end time");
        }

        var cacheKey = $"historical_prices_{symbol}_{startTime:yyyyMMddHHmm}_{endTime:yyyyMMddHHmm}";

        return await _cacheService.GetOrSetAsync(
            cacheKey,
            async () => await _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime),
            TimeSpan.FromMinutes(HISTORICAL_CACHE_MINUTES));
    }
}

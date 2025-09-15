using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Infrastructure.Services;

/// <summary>
/// Advanced cached decorator for ICryptoExchangeService with intelligent caching strategies
/// </summary>
public class CachedCryptoExchangeService : ICryptoExchangeService
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly ICacheService _cacheService;
    private readonly ITimeProvider _timeProvider;
    private readonly ILogger<CachedCryptoExchangeService> _logger;

    // Cache duration constants
    private const int CURRENT_PRICE_CACHE_SECONDS = 5;    // Very short cache for current prices
    private const int RECENT_HISTORICAL_CACHE_MINUTES = 15;  // Recent historical data
    private const int HISTORICAL_CACHE_HOURS = 4;           // Older historical data
    private const int LONG_TERM_HISTORICAL_CACHE_HOURS = 24;  // Very old historical data

    public CachedCryptoExchangeService(
        ICryptoExchangeService exchangeService,
        ICacheService cacheService,
        ITimeProvider timeProvider,
        ILogger<CachedCryptoExchangeService> logger)
    {
        _exchangeService = exchangeService ?? throw new ArgumentNullException(nameof(exchangeService));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<CryptoPrice> GetCurrentPriceAsync(string symbol)
    {
        // Cache current price for a very short time to reduce API calls for rapid requests
        var cacheKey = $"current_price_{symbol}";
        var options = new CacheOptions
        {
            Expiration = TimeSpan.FromSeconds(CURRENT_PRICE_CACHE_SECONDS),
            Priority = CachePriority.High,
            Tags = new[] { "prices", $"symbol:{symbol}", "current" },
            EnableBackgroundRefresh = true,
            BackgroundRefreshThreshold = 0.6 // Refresh after 60% of cache time
        };

        return await _cacheService.GetOrSetAsync(
            cacheKey,
            async () =>
            {
                _logger.LogDebug("Fetching current price for {Symbol} from exchange", symbol);
                return await _exchangeService.GetCurrentPriceAsync(symbol);
            },
            options);
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
        var options = CreateHistoricalCacheOptions(symbol, startTime, endTime);

        return await _cacheService.GetOrSetAsync(
            cacheKey,
            async () =>
            {
                _logger.LogDebug("Fetching historical prices for {Symbol} from {Start} to {End}",
                    symbol, startTime, endTime);
                return await _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime);
            },
            options);
    }

    public async Task<IReadOnlyList<CandlestickData>> GetHistoricalCandlestickDataAsync(
        string symbol,
        DateTimeOffset startTime,
        DateTimeOffset endTime)
    {
        if (startTime >= endTime)
        {
            throw new ArgumentException("Start time must be before end time");
        }

        var cacheKey = $"candlestick_data_{symbol}_{startTime:yyyyMMddHHmm}_{endTime:yyyyMMddHHmm}";
        var options = CreateHistoricalCacheOptions(symbol, startTime, endTime);

        return await _cacheService.GetOrSetAsync(
            cacheKey,
            async () =>
            {
                _logger.LogDebug("Fetching historical candlestick data for {Symbol} from {Start} to {End}",
                    symbol, startTime, endTime);
                return await _exchangeService.GetHistoricalCandlestickDataAsync(symbol, startTime, endTime);
            },
            options);
    }

    /// <summary>
    /// Creates appropriate cache options based on the age and duration of historical data
    /// </summary>
    private CacheOptions CreateHistoricalCacheOptions(string symbol, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        var now = _timeProvider.GetUtcNow();
        var dataAge = now - endTime;
        var duration = endTime - startTime;

        // Determine cache duration based on data age and range
        TimeSpan cacheDuration;
        CachePriority priority;
        bool enableBackgroundRefresh;

        if (dataAge <= TimeSpan.FromHours(1))
        {
            // Very recent data - shorter cache, higher priority
            cacheDuration = TimeSpan.FromMinutes(RECENT_HISTORICAL_CACHE_MINUTES);
            priority = CachePriority.High;
            enableBackgroundRefresh = true;
        }
        else if (dataAge <= TimeSpan.FromDays(1))
        {
            // Recent data - medium cache duration
            cacheDuration = TimeSpan.FromHours(HISTORICAL_CACHE_HOURS);
            priority = CachePriority.Normal;
            enableBackgroundRefresh = false;
        }
        else
        {
            // Old data - longer cache, lower priority (historical data rarely changes)
            cacheDuration = TimeSpan.FromHours(LONG_TERM_HISTORICAL_CACHE_HOURS);
            priority = CachePriority.Low;
            enableBackgroundRefresh = false;
        }

        // Adjust for sliding expiration based on data range
        TimeSpan? slidingExpiration = null;
        if (duration <= TimeSpan.FromHours(1) && dataAge <= TimeSpan.FromHours(6))
        {
            // Short-term data gets sliding expiration to keep frequently accessed data fresh
            slidingExpiration = TimeSpan.FromMinutes(30);
        }

        return new CacheOptions
        {
            Expiration = cacheDuration,
            SlidingExpiration = slidingExpiration,
            Priority = priority,
            Tags = new[]
            {
                "prices",
                $"symbol:{symbol}",
                "historical",
                GetDataAgeTag(dataAge),
                GetDurationTag(duration)
            },
            EnableBackgroundRefresh = enableBackgroundRefresh,
            BackgroundRefreshThreshold = 0.75
        };
    }

    /// <summary>
    /// Warms up the cache with frequently accessed data
    /// </summary>
    public async Task WarmUpCacheAsync(string[] symbols, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        var tasks = symbols.Select(async symbol =>
        {
            try
            {
                _logger.LogDebug("Warming up cache for symbol: {Symbol}", symbol);

                // Warm up current price
                await GetCurrentPriceAsync(symbol);

                // Warm up recent historical data
                var recentStart = _timeProvider.GetUtcNow().AddHours(-24);
                var recentEnd = _timeProvider.GetUtcNow();

                if (recentStart < endTime && recentEnd > startTime)
                {
                    await GetHistoricalPricesAsync(symbol, recentStart, recentEnd);
                }

                _logger.LogDebug("Cache warmed up for symbol: {Symbol}", symbol);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to warm up cache for symbol: {Symbol}", symbol);
            }
        });

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Invalidates cache entries for a specific symbol
    /// </summary>
    public void InvalidateSymbolCache(string symbol)
    {
        _cacheService.RemoveByTag($"symbol:{symbol}");
        _logger.LogDebug("Invalidated cache for symbol: {Symbol}", symbol);
    }

    /// <summary>
    /// Invalidates all price-related cache entries
    /// </summary>
    public void InvalidateAllPriceCache()
    {
        _cacheService.RemoveByTag("prices");
        _logger.LogDebug("Invalidated all price cache entries");
    }

    /// <summary>
    /// Gets cache performance statistics
    /// </summary>
    public CacheStatistics GetCacheStatistics()
    {
        return _cacheService.GetStatistics();
    }

    private static string GetDataAgeTag(TimeSpan age)
    {
        if (age <= TimeSpan.FromHours(1)) return "age:recent";
        if (age <= TimeSpan.FromDays(1)) return "age:daily";
        if (age <= TimeSpan.FromDays(7)) return "age:weekly";
        return "age:historical";
    }

    private static string GetDurationTag(TimeSpan duration)
    {
        if (duration <= TimeSpan.FromHours(1)) return "duration:short";
        if (duration <= TimeSpan.FromDays(1)) return "duration:daily";
        if (duration <= TimeSpan.FromDays(7)) return "duration:weekly";
        return "duration:long";
    }
}

using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace AkashTrends.Infrastructure.Services;

/// <summary>
/// High-performance cached implementation of indicator calculations with parallel processing
/// </summary>
public class CachedIndicatorService : IIndicatorService
{
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ICryptoExchangeService _exchangeService;
    private readonly ICacheService _cacheService;
    private readonly ITimeProvider _timeProvider;
    private readonly ILogger<CachedIndicatorService> _logger;

    // Cache duration constants based on timeframe
    private const int SHORT_TERM_CACHE_MINUTES = 5;   // For recent data
    private const int MEDIUM_TERM_CACHE_MINUTES = 30; // For hourly/daily calculations
    private const int LONG_TERM_CACHE_HOURS = 4;      // For historical calculations

    public CachedIndicatorService(
        IIndicatorFactory indicatorFactory,
        ICryptoExchangeService exchangeService,
        ICacheService cacheService,
        ITimeProvider timeProvider,
        ILogger<CachedIndicatorService> logger)
    {
        _indicatorFactory = indicatorFactory ?? throw new ArgumentNullException(nameof(indicatorFactory));
        _exchangeService = exchangeService ?? throw new ArgumentNullException(nameof(exchangeService));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IndicatorResult> CalculateIndicatorAsync(
        string symbol,
        IndicatorType type,
        int period,
        DateTimeOffset startTime,
        DateTimeOffset endTime)
    {
        if (startTime >= endTime)
        {
            throw new ArgumentException("Start time must be before end time");
        }

        var cacheKey = $"indicator_{symbol}_{type}_{period}_{startTime:yyyyMMddHHmm}_{endTime:yyyyMMddHHmm}";
        var options = CreateIndicatorCacheOptions(symbol, type, startTime, endTime);

        return await _cacheService.GetOrSetAsync(
            cacheKey,
            async () =>
            {
                _logger.LogDebug("Calculating indicator {Type} for {Symbol} with period {Period}",
                    type, symbol, period);

                // Get historical prices
                var prices = await _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime);

                if (!prices.Any())
                {
                    _logger.LogWarning("No price data available for indicator calculation: {Symbol}", symbol);
                    return IndicatorResult.Empty();
                }

                // Create and calculate indicator
                var indicator = _indicatorFactory.CreateIndicator(type, period);
                var result = indicator.Calculate(prices);

                _logger.LogDebug("Successfully calculated indicator {Type} for {Symbol}, " +
                    "Values count: {Count}", type, symbol, result.Values.Count);

                return result;
            },
            options);
    }

    /// <summary>
    /// Calculates multiple indicators in parallel for better performance
    /// </summary>
    public async Task<IDictionary<IndicatorType, IndicatorResult>> CalculateMultipleIndicatorsAsync(
        string symbol,
        IEnumerable<(IndicatorType Type, int Period)> indicators,
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        CancellationToken cancellationToken = default)
    {
        if (startTime >= endTime)
        {
            throw new ArgumentException("Start time must be before end time");
        }

        var indicatorList = indicators.ToList();
        if (!indicatorList.Any())
        {
            return new Dictionary<IndicatorType, IndicatorResult>();
        }

        _logger.LogDebug("Calculating {Count} indicators for {Symbol} in parallel",
            indicatorList.Count, symbol);

        // Use parallel processing for multiple indicators
        var semaphore = new SemaphoreSlim(Environment.ProcessorCount, Environment.ProcessorCount);
        var results = new ConcurrentDictionary<IndicatorType, IndicatorResult>();
        var tasks = indicatorList.Select(async indicator =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                var result = await CalculateIndicatorAsync(
                    symbol,
                    indicator.Type,
                    indicator.Period,
                    startTime,
                    endTime);
                results[indicator.Type] = result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate indicator {Type} for {Symbol}",
                    indicator.Type, symbol);
                results[indicator.Type] = IndicatorResult.Empty();
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);

        _logger.LogInformation("Completed parallel calculation of {Count} indicators for {Symbol}",
            indicatorList.Count, symbol);

        return results.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
    }

    /// <summary>
    /// Calculates indicators across multiple timeframes for comprehensive analysis
    /// </summary>
    public async Task<IDictionary<Timeframe, IDictionary<IndicatorType, IndicatorResult>>>
        CalculateMultipleTimeframesAsync(
            string symbol,
            IEnumerable<(IndicatorType Type, int Period)> indicators,
            IEnumerable<Timeframe> timeframes,
            CancellationToken cancellationToken = default)
    {
        var indicatorList = indicators.ToList();
        var timeframeList = timeframes.ToList();

        if (!indicatorList.Any() || !timeframeList.Any())
        {
            return new Dictionary<Timeframe, IDictionary<IndicatorType, IndicatorResult>>();
        }

        _logger.LogDebug("Calculating indicators across {TimeframeCount} timeframes for {Symbol}",
            timeframeList.Count, symbol);

        var now = _timeProvider.GetUtcNow();
        var results = new ConcurrentDictionary<Timeframe, IDictionary<IndicatorType, IndicatorResult>>();

        // Calculate for each timeframe in parallel
        var semaphore = new SemaphoreSlim(Math.Min(timeframeList.Count, Environment.ProcessorCount));
        var tasks = timeframeList.Select(async timeframe =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                var (startTime, endTime) = CalculateTimeframeRange(now, timeframe);
                var timeframeResults = await CalculateMultipleIndicatorsAsync(
                    symbol, indicatorList, startTime, endTime, cancellationToken);

                results[timeframe] = timeframeResults;

                _logger.LogDebug("Completed indicators for timeframe {Timeframe} and symbol {Symbol}",
                    timeframe, symbol);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate indicators for timeframe {Timeframe} and symbol {Symbol}",
                    timeframe, symbol);
                results[timeframe] = new Dictionary<IndicatorType, IndicatorResult>();
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);

        _logger.LogInformation("Completed multi-timeframe calculation for {Symbol}: " +
            "{TimeframeCount} timeframes, {IndicatorCount} indicators",
            symbol, timeframeList.Count, indicatorList.Count);

        return results.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
    }

    /// <summary>
    /// Pre-calculates and caches indicators for popular symbols and timeframes
    /// </summary>
    public async Task WarmUpIndicatorCacheAsync(
        string[] symbols,
        IndicatorType[] indicatorTypes,
        Timeframe[] timeframes,
        CancellationToken cancellationToken = default)
    {
        var indicators = indicatorTypes.Select(type => (type, GetDefaultPeriod(type))).ToArray();

        _logger.LogInformation("Starting indicator cache warm-up for {SymbolCount} symbols, " +
            "{IndicatorCount} indicators, {TimeframeCount} timeframes",
            symbols.Length, indicators.Length, timeframes.Length);

        var warmupTasks = symbols.Select(async symbol =>
        {
            try
            {
                await CalculateMultipleTimeframesAsync(
                    symbol, indicators, timeframes, cancellationToken);

                _logger.LogDebug("Completed cache warm-up for symbol: {Symbol}", symbol);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to warm up cache for symbol: {Symbol}", symbol);
            }
        });

        await Task.WhenAll(warmupTasks);

        _logger.LogInformation("Completed indicator cache warm-up");
    }

    /// <summary>
    /// Invalidates cached indicators for a specific symbol
    /// </summary>
    public void InvalidateIndicatorCache(string symbol)
    {
        _cacheService.RemoveByTag($"symbol:{symbol}");
        _logger.LogDebug("Invalidated indicator cache for symbol: {Symbol}", symbol);
    }

    /// <summary>
    /// Gets cache performance statistics for indicators
    /// </summary>
    public CacheStatistics GetIndicatorCacheStatistics()
    {
        return _cacheService.GetStatistics();
    }

    private CacheOptions CreateIndicatorCacheOptions(string symbol, IndicatorType type,
        DateTimeOffset startTime, DateTimeOffset endTime)
    {
        var now = _timeProvider.GetUtcNow();
        var dataAge = now - endTime;
        var duration = endTime - startTime;

        // Determine cache duration based on data recency and calculation complexity
        TimeSpan cacheDuration;
        CachePriority priority;

        if (dataAge <= TimeSpan.FromMinutes(30))
        {
            // Very recent data - shorter cache for real-time updates
            cacheDuration = TimeSpan.FromMinutes(SHORT_TERM_CACHE_MINUTES);
            priority = CachePriority.High;
        }
        else if (dataAge <= TimeSpan.FromHours(6))
        {
            // Recent data - medium cache duration
            cacheDuration = TimeSpan.FromMinutes(MEDIUM_TERM_CACHE_MINUTES);
            priority = CachePriority.Normal;
        }
        else
        {
            // Historical data - longer cache (calculations rarely change)
            cacheDuration = TimeSpan.FromHours(LONG_TERM_CACHE_HOURS);
            priority = CachePriority.Low;
        }

        return new CacheOptions
        {
            Expiration = cacheDuration,
            Priority = priority,
            Tags = new[]
            {
                "indicators",
                $"symbol:{symbol}",
                $"type:{type}",
                GetDataAgeTag(dataAge),
                GetDurationTag(duration)
            },
            EnableBackgroundRefresh = dataAge <= TimeSpan.FromHours(1),
            BackgroundRefreshThreshold = 0.8
        };
    }

    private static (DateTimeOffset StartTime, DateTimeOffset EndTime) CalculateTimeframeRange(
        DateTimeOffset now, Timeframe timeframe)
    {
        return timeframe switch
        {
            Timeframe.Minute => (now.AddMinutes(-60), now),      // Last hour
            Timeframe.FiveMinutes => (now.AddHours(-4), now),    // Last 4 hours
            Timeframe.FifteenMinutes => (now.AddHours(-12), now), // Last 12 hours
            Timeframe.Hour => (now.AddDays(-2), now),            // Last 2 days
            Timeframe.FourHours => (now.AddDays(-7), now),       // Last week
            Timeframe.Day => (now.AddDays(-30), now),            // Last month
            Timeframe.Week => (now.AddDays(-180), now),          // Last 6 months
            _ => (now.AddDays(-30), now)
        };
    }

    private static int GetDefaultPeriod(IndicatorType type)
    {
        return type switch
        {
            IndicatorType.SimpleMovingAverage => 20,
            IndicatorType.ExponentialMovingAverage => 20,
            IndicatorType.RelativeStrengthIndex => 14,
            IndicatorType.BollingerBands => 20,
            IndicatorType.StochasticOscillator => 14,
            _ => 14
        };
    }

    private static string GetDataAgeTag(TimeSpan age)
    {
        if (age <= TimeSpan.FromMinutes(30)) return "age:realtime";
        if (age <= TimeSpan.FromHours(6)) return "age:recent";
        if (age <= TimeSpan.FromDays(1)) return "age:daily";
        return "age:historical";
    }

    private static string GetDurationTag(TimeSpan duration)
    {
        if (duration <= TimeSpan.FromHours(1)) return "duration:short";
        if (duration <= TimeSpan.FromHours(6)) return "duration:medium";
        if (duration <= TimeSpan.FromDays(1)) return "duration:daily";
        return "duration:long";
    }
}

using AkashTrends.Core.Cache;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace AkashTrends.Infrastructure.Cache;

/// <summary>
/// Advanced implementation of ICacheService using IMemoryCache with enhanced features
/// </summary>
public class CacheService : ICacheService
{
    private readonly IMemoryCache _cache;
    private readonly ITimeProvider _timeProvider;
    private readonly ILogger<CacheService> _logger;
    private readonly ConcurrentDictionary<string, string[]> _keyTags = new();
    private readonly ConcurrentDictionary<string, TaskCompletionSource<bool>> _refreshTasks = new();

    private long _hitCount;
    private long _missCount;

    public CacheService(
        IMemoryCache cache,
        ITimeProvider timeProvider,
        ILogger<CacheService> logger)
    {
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    private class CacheEntry<T>
    {
        public T Value { get; set; }
        public DateTimeOffset ExpirationTime { get; set; }
        public DateTimeOffset? SlidingExpirationTime { get; set; }
        public CacheOptions Options { get; set; }
        public Func<Task<T>>? Factory { get; set; }

        public CacheEntry(T value, DateTimeOffset expirationTime, CacheOptions options, Func<Task<T>>? factory = null)
        {
            Value = value;
            ExpirationTime = expirationTime;
            Options = options;
            Factory = factory;
        }

        public bool IsExpired(DateTimeOffset currentTime)
        {
            if (SlidingExpirationTime.HasValue)
            {
                return currentTime > SlidingExpirationTime.Value;
            }
            return currentTime >= ExpirationTime;
        }

        public bool IsNearExpiration(DateTimeOffset currentTime)
        {
            if (!Options.EnableBackgroundRefresh || Factory == null) return false;

            var threshold = Options.BackgroundRefreshThreshold;
            var elapsed = currentTime - (ExpirationTime - Options.Expiration);
            var totalDuration = Options.Expiration.TotalMilliseconds;

            return (elapsed.TotalMilliseconds / totalDuration) >= threshold;
        }
    }

    public async Task<T> GetOrSetAsync<T>(
        string key,
        Func<Task<T>> factory,
        TimeSpan expiration,
        CancellationToken cancellationToken = default)
    {
        var options = new CacheOptions { Expiration = expiration };
        return await GetOrSetAsync(key, factory, options, cancellationToken);
    }

    public async Task<T> GetOrSetAsync<T>(
        string key,
        Func<Task<T>> factory,
        CacheOptions options,
        CancellationToken cancellationToken = default)
    {
        var currentTime = _timeProvider.GetUtcNow();

        if (_cache.TryGetValue(key, out CacheEntry<T>? entry) && entry is not null)
        {
            if (!entry.IsExpired(currentTime))
            {
                Interlocked.Increment(ref _hitCount);
                _logger.LogDebug("Cache hit for key: {Key}", key);

                // Update sliding expiration
                if (options.SlidingExpiration.HasValue)
                {
                    entry.SlidingExpirationTime = currentTime.Add(options.SlidingExpiration.Value);
                }

                // Background refresh if near expiration
                if (entry.IsNearExpiration(currentTime) && entry.Factory != null)
                {
                    _ = Task.Run(async () => await BackgroundRefresh(key, entry), cancellationToken);
                }

                return entry.Value;
            }

            _cache.Remove(key);
            CleanupTags(key);
        }

        Interlocked.Increment(ref _missCount);
        _logger.LogDebug("Cache miss for key: {Key}", key);

        cancellationToken.ThrowIfCancellationRequested();

        var value = await factory();
        var expirationTime = currentTime.Add(options.Expiration);
        var newEntry = new CacheEntry<T>(value, expirationTime, options, factory);

        if (options.SlidingExpiration.HasValue)
        {
            newEntry.SlidingExpirationTime = currentTime.Add(options.SlidingExpiration.Value);
        }

        var memoryCacheOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpiration = expirationTime,
            Priority = MapPriority(options.Priority)
        };

        if (options.SlidingExpiration.HasValue)
        {
            memoryCacheOptions.SlidingExpiration = options.SlidingExpiration;
        }

        memoryCacheOptions.RegisterPostEvictionCallback((evictedKey, evictedValue, reason, state) =>
        {
            _logger.LogDebug("Cache entry evicted: {Key}, Reason: {Reason}", evictedKey, reason);
            if (evictedKey is string stringKey)
            {
                CleanupTags(stringKey);
            }
        });

        _cache.Set(key, newEntry, memoryCacheOptions);

        // Track tags
        if (options.Tags?.Length > 0)
        {
            _keyTags[key] = options.Tags;
        }

        return value;
    }

    public void Remove(string key)
    {
        _cache.Remove(key);
        CleanupTags(key);
        _logger.LogDebug("Cache entry removed: {Key}", key);
    }

    public void RemoveByTag(string tag)
    {
        var keysToRemove = _keyTags
            .Where(kvp => kvp.Value.Contains(tag))
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in keysToRemove)
        {
            Remove(key);
        }

        _logger.LogDebug("Cache entries removed by tag: {Tag}, Count: {Count}", tag, keysToRemove.Count);
    }

    public void RemoveByPattern(string pattern)
    {
        var regex = new Regex(pattern, RegexOptions.Compiled | RegexOptions.IgnoreCase);
        var keysToRemove = new List<string>();

        // Note: IMemoryCache doesn't expose keys directly, so we track them in _keyTags
        // This is a limitation - we can only remove keys that have tags
        foreach (var key in _keyTags.Keys)
        {
            if (regex.IsMatch(key))
            {
                keysToRemove.Add(key);
            }
        }

        foreach (var key in keysToRemove)
        {
            Remove(key);
        }

        _logger.LogDebug("Cache entries removed by pattern: {Pattern}, Count: {Count}", pattern, keysToRemove.Count);
    }

    public void WarmUp<T>(string key, T value, CacheOptions options)
    {
        var currentTime = _timeProvider.GetUtcNow();
        var expirationTime = currentTime.Add(options.Expiration);
        var entry = new CacheEntry<T>(value, expirationTime, options);

        if (options.SlidingExpiration.HasValue)
        {
            entry.SlidingExpirationTime = currentTime.Add(options.SlidingExpiration.Value);
        }

        var memoryCacheOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpiration = expirationTime,
            Priority = MapPriority(options.Priority)
        };

        if (options.SlidingExpiration.HasValue)
        {
            memoryCacheOptions.SlidingExpiration = options.SlidingExpiration;
        }

        _cache.Set(key, entry, memoryCacheOptions);

        // Track tags
        if (options.Tags?.Length > 0)
        {
            _keyTags[key] = options.Tags;
        }

        _logger.LogDebug("Cache warmed up for key: {Key}", key);
    }

    public CacheStatistics GetStatistics()
    {
        var hitCount = Interlocked.Read(ref _hitCount);
        var missCount = Interlocked.Read(ref _missCount);

        return new CacheStatistics
        {
            HitCount = hitCount,
            MissCount = missCount,
            CurrentCount = _keyTags.Count, // Approximation
            EstimatedSize = EstimateCacheSize()
        };
    }

    private static Microsoft.Extensions.Caching.Memory.CacheItemPriority MapPriority(CachePriority priority)
    {
        return priority switch
        {
            CachePriority.Low => Microsoft.Extensions.Caching.Memory.CacheItemPriority.Low,
            CachePriority.Normal => Microsoft.Extensions.Caching.Memory.CacheItemPriority.Normal,
            CachePriority.High => Microsoft.Extensions.Caching.Memory.CacheItemPriority.High,
            CachePriority.NeverRemove => Microsoft.Extensions.Caching.Memory.CacheItemPriority.NeverRemove,
            _ => Microsoft.Extensions.Caching.Memory.CacheItemPriority.Normal
        };
    }

    private void CleanupTags(string key)
    {
        _keyTags.TryRemove(key, out _);
    }

    private async Task BackgroundRefresh<T>(string key, CacheEntry<T> entry)
    {
        if (entry.Factory == null) return;

        // Prevent multiple concurrent refreshes for the same key
        var tcs = new TaskCompletionSource<bool>();
        if (!_refreshTasks.TryAdd(key, tcs))
        {
            // Another refresh is already in progress
            return;
        }

        try
        {
            _logger.LogDebug("Starting background refresh for key: {Key}", key);
            var newValue = await entry.Factory();

            // Update the cache entry with the new value
            var currentTime = _timeProvider.GetUtcNow();
            var expirationTime = currentTime.Add(entry.Options.Expiration);
            var newEntry = new CacheEntry<T>(newValue, expirationTime, entry.Options, entry.Factory);

            if (entry.Options.SlidingExpiration.HasValue)
            {
                newEntry.SlidingExpirationTime = currentTime.Add(entry.Options.SlidingExpiration.Value);
            }

            var memoryCacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpiration = expirationTime,
                Priority = MapPriority(entry.Options.Priority)
            };

            if (entry.Options.SlidingExpiration.HasValue)
            {
                memoryCacheOptions.SlidingExpiration = entry.Options.SlidingExpiration;
            }

            _cache.Set(key, newEntry, memoryCacheOptions);
            _logger.LogDebug("Background refresh completed for key: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Background refresh failed for key: {Key}", key);
        }
        finally
        {
            _refreshTasks.TryRemove(key, out _);
            tcs.SetResult(true);
        }
    }

    private long EstimateCacheSize()
    {
        // This is a rough estimation since IMemoryCache doesn't provide exact size information
        // We estimate based on the number of tracked keys
        return _keyTags.Count * 1024; // Rough estimate: 1KB per cache entry
    }
}

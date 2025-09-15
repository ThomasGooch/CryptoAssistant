namespace AkashTrends.Core.Cache;

/// <summary>
/// Advanced caching options for cache entries
/// </summary>
public class CacheOptions
{
    /// <summary>
    /// Cache expiration time
    /// </summary>
    public TimeSpan Expiration { get; init; } = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Sliding expiration - extends expiration on access
    /// </summary>
    public TimeSpan? SlidingExpiration { get; init; }

    /// <summary>
    /// Cache priority for eviction policies
    /// </summary>
    public CachePriority Priority { get; init; } = CachePriority.Normal;

    /// <summary>
    /// Tags for cache invalidation
    /// </summary>
    public string[]? Tags { get; init; }

    /// <summary>
    /// Enable background refresh when near expiration
    /// </summary>
    public bool EnableBackgroundRefresh { get; init; }

    /// <summary>
    /// Background refresh threshold (percentage of expiration time)
    /// </summary>
    public double BackgroundRefreshThreshold { get; init; } = 0.8;
}

/// <summary>
/// Cache priority levels for eviction policies
/// </summary>
public enum CachePriority
{
    Low,
    Normal,
    High,
    NeverRemove
}

/// <summary>
/// Interface for advanced caching service
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Gets a value from cache or sets it using the factory if it doesn't exist
    /// </summary>
    /// <typeparam name="T">Type of the cached value</typeparam>
    /// <param name="key">Cache key</param>
    /// <param name="factory">Factory method to create the value if not found in cache</param>
    /// <param name="expiration">Cache expiration time</param>
    /// <param name="cancellationToken">Optional cancellation token</param>
    /// <returns>The cached or newly created value</returns>
    Task<T> GetOrSetAsync<T>(
        string key,
        Func<Task<T>> factory,
        TimeSpan expiration,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a value from cache or sets it using the factory with advanced options
    /// </summary>
    /// <typeparam name="T">Type of the cached value</typeparam>
    /// <param name="key">Cache key</param>
    /// <param name="factory">Factory method to create the value if not found in cache</param>
    /// <param name="options">Advanced cache options</param>
    /// <param name="cancellationToken">Optional cancellation token</param>
    /// <returns>The cached or newly created value</returns>
    Task<T> GetOrSetAsync<T>(
        string key,
        Func<Task<T>> factory,
        CacheOptions options,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes an item from the cache
    /// </summary>
    /// <param name="key">Cache key to remove</param>
    void Remove(string key);

    /// <summary>
    /// Removes all cache entries with the specified tag
    /// </summary>
    /// <param name="tag">Tag to invalidate</param>
    void RemoveByTag(string tag);

    /// <summary>
    /// Removes cache entries matching the pattern
    /// </summary>
    /// <param name="pattern">Key pattern to match</param>
    void RemoveByPattern(string pattern);

    /// <summary>
    /// Warms up cache with the specified data
    /// </summary>
    /// <typeparam name="T">Type of the cached value</typeparam>
    /// <param name="key">Cache key</param>
    /// <param name="value">Value to cache</param>
    /// <param name="options">Cache options</param>
    void WarmUp<T>(string key, T value, CacheOptions options);

    /// <summary>
    /// Gets cache statistics
    /// </summary>
    /// <returns>Cache statistics information</returns>
    CacheStatistics GetStatistics();
}

/// <summary>
/// Cache statistics information
/// </summary>
public class CacheStatistics
{
    /// <summary>
    /// Total number of cache hits
    /// </summary>
    public long HitCount { get; init; }

    /// <summary>
    /// Total number of cache misses
    /// </summary>
    public long MissCount { get; init; }

    /// <summary>
    /// Cache hit ratio (0.0 to 1.0)
    /// </summary>
    public double HitRatio => (HitCount + MissCount) > 0 ? (double)HitCount / (HitCount + MissCount) : 0.0;

    /// <summary>
    /// Number of items currently in cache
    /// </summary>
    public int CurrentCount { get; init; }

    /// <summary>
    /// Estimated memory usage in bytes
    /// </summary>
    public long EstimatedSize { get; init; }
}

namespace AkashTrends.Core.Cache;

/// <summary>
/// Interface for caching service
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
    /// Removes an item from the cache
    /// </summary>
    /// <param name="key">Cache key to remove</param>
    void Remove(string key);
}

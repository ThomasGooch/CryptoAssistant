using AkashTrends.Core.Cache;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Caching.Memory;

namespace AkashTrends.Infrastructure.Cache;

/// <summary>
/// Implementation of ICacheService using IMemoryCache
/// </summary>
public class CacheService : ICacheService
{
    private readonly IMemoryCache _cache;
    private readonly ITimeProvider _timeProvider;

    public CacheService(IMemoryCache cache, ITimeProvider timeProvider)
    {
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    }

    /// <inheritdoc/>
    private class CacheEntry<T>
    {
        public T Value { get; set; }
        public DateTimeOffset ExpirationTime { get; set; }

        public CacheEntry(T value, DateTimeOffset expirationTime)
        {
            Value = value;
            ExpirationTime = expirationTime;
        }
    }

    public async Task<T> GetOrSetAsync<T>(
        string key,
        Func<Task<T>> factory,
        TimeSpan expiration,
        CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(key, out CacheEntry<T>? entry) && entry is not null)
        {
            if (_timeProvider.GetUtcNow() < entry.ExpirationTime)
            {
                return entry.Value;
            }
            _cache.Remove(key);
        }

        cancellationToken.ThrowIfCancellationRequested();

        var value = await factory();
        var expirationTime = _timeProvider.GetUtcNow().Add(expiration);
        var newEntry = new CacheEntry<T>(value, expirationTime);

        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpiration = expirationTime
        };

        _cache.Set(key, newEntry, options);

        return value;
    }

    /// <inheritdoc/>
    public void Remove(string key)
    {
        _cache.Remove(key);
    }
}

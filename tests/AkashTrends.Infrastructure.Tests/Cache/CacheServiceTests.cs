using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.Cache;
using Microsoft.Extensions.Caching.Memory;
using NSubstitute;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Cache;

public class CacheServiceTests
{
    private readonly IMemoryCache _memoryCache;
    private readonly ICacheService _cacheService;
    private readonly ITimeProvider _timeProvider;
    private readonly DateTimeOffset _baseTime;

    public CacheServiceTests()
    {
        _memoryCache = new MemoryCache(new MemoryCacheOptions());
        _baseTime = DateTimeOffset.UtcNow;
        _timeProvider = Substitute.For<ITimeProvider>();
        _timeProvider.GetUtcNow().Returns(_baseTime);
        _cacheService = new CacheService(_memoryCache, _timeProvider);
    }

    [Fact]
    public async Task GetOrSet_WhenKeyNotInCache_ShouldCallFactoryAndCache()
    {
        // Arrange
        var key = "test_key";
        var expectedValue = "test_value";
        var callCount = 0;

        // Act
        var result1 = await _cacheService.GetOrSetAsync(key, () =>
        {
            callCount++;
            return Task.FromResult(expectedValue);
        }, TimeSpan.FromMinutes(5));

        var result2 = await _cacheService.GetOrSetAsync(key, () =>
        {
            callCount++;
            return Task.FromResult(expectedValue);
        }, TimeSpan.FromMinutes(5));

        // Assert
        Assert.Equal(expectedValue, result1);
        Assert.Equal(expectedValue, result2);
        Assert.Equal(1, callCount); // Factory should only be called once
    }

    [Fact]
    public async Task GetOrSet_WhenCacheExpires_ShouldCallFactoryAgain()
    {
        // Arrange
        var key = "test_key";
        var callCount = 0;
        var expectedValue1 = "test_value1";
        var expectedValue2 = "test_value2";

        Func<Task<string>> factory = () =>
        {
            callCount++;
            return Task.FromResult(callCount == 1 ? expectedValue1 : expectedValue2);
        };

        // Act - First call should use factory and cache the result
        var result1 = await _cacheService.GetOrSetAsync(key, factory, TimeSpan.FromMinutes(5));

        // Move time forward past expiration
        _timeProvider.GetUtcNow().Returns(_baseTime.AddMinutes(6));

        // Act - Second call should use factory again due to expiration
        var result2 = await _cacheService.GetOrSetAsync(key, factory, TimeSpan.FromMinutes(5));

        // Assert
        Assert.Equal(expectedValue1, result1);
        Assert.Equal(expectedValue2, result2);
        Assert.Equal(2, callCount); // Factory should be called twice
    }

    [Fact]
    public async Task GetOrSet_WithCancellationToken_ShouldRespectCancellation()
    {
        // Arrange
        var key = "test_key";
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            _cacheService.GetOrSetAsync(key, () => Task.FromResult("value"), TimeSpan.FromMinutes(5), cts.Token));
    }

    [Fact]
    public async Task Remove_ShouldRemoveItemFromCache()
    {
        // Arrange
        var key = "test_key";
        var expectedValue = "test_value";
        var callCount = 0;

        // Act
        var result1 = await _cacheService.GetOrSetAsync(key, () =>
        {
            callCount++;
            return Task.FromResult(expectedValue);
        }, TimeSpan.FromMinutes(5));

        _cacheService.Remove(key);

        var result2 = await _cacheService.GetOrSetAsync(key, () =>
        {
            callCount++;
            return Task.FromResult(expectedValue);
        }, TimeSpan.FromMinutes(5));

        // Assert
        Assert.Equal(expectedValue, result1);
        Assert.Equal(expectedValue, result2);
        Assert.Equal(2, callCount); // Factory should be called twice due to removal
    }
}

using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class CachedCryptoExchangeServiceTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly ICacheService _cacheService;
    private readonly ITimeProvider _timeProvider;
    private readonly ILogger<CachedCryptoExchangeService> _logger;
    private readonly ICryptoExchangeService _cachedService;
    private readonly DateTimeOffset _baseTime;

    public CachedCryptoExchangeServiceTests()
    {
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _cacheService = Substitute.For<ICacheService>();
        _logger = Substitute.For<ILogger<CachedCryptoExchangeService>>();
        _baseTime = DateTimeOffset.UtcNow;
        _timeProvider = Substitute.For<ITimeProvider>();
        _timeProvider.GetUtcNow().Returns(_baseTime);
        _cachedService = new CachedCryptoExchangeService(_exchangeService, _cacheService, _timeProvider, _logger);
    }

    [Fact]
    public async Task GetHistoricalPricesAsync_WhenNotInCache_ShouldFetchAndCache()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = _baseTime.AddDays(-1);
        var endTime = _baseTime;
        var expectedPrices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 51000m, endTime)
        };

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(Task.FromResult<IReadOnlyList<CryptoPrice>>(expectedPrices));

        _cacheService
            .GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var factory = callInfo.ArgAt<Func<Task<IReadOnlyList<CryptoPrice>>>>(1);
                return factory();
            });

        // Act
        var result = await _cachedService.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Assert
        Assert.Equal(expectedPrices, result);
        await _cacheService.Received(1)
            .GetOrSetAsync(
                Arg.Is<string>(s => s.Contains(symbol) && s.Contains("historical")),
                Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetHistoricalPricesAsync_WhenInCache_ShouldNotCallExchange()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = _baseTime.AddDays(-1);
        var endTime = _baseTime;
        var cachedPrices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 51000m, endTime)
        };

        _cacheService
            .GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<IReadOnlyList<CryptoPrice>>(cachedPrices));

        // Act
        var result = await _cachedService.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Assert
        Assert.Equal(cachedPrices, result);
        await _exchangeService.DidNotReceive().GetHistoricalPricesAsync(
            Arg.Any<string>(),
            Arg.Any<DateTimeOffset>(),
            Arg.Any<DateTimeOffset>());
    }

    [Fact]
    public async Task GetHistoricalPricesAsync_WithInvalidDates_ShouldThrowArgumentException()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = _baseTime;
        var endTime = _baseTime.AddDays(-1); // End before start

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _cachedService.GetHistoricalPricesAsync(symbol, startTime, endTime));
    }

    [Fact]
    public async Task GetCurrentPriceAsync_WithAdvancedCaching_ShouldUseShortTermCache()
    {
        // Arrange
        var symbol = "BTC";
        var expectedPrice = CryptoPrice.Create(
            CryptoCurrency.Create(symbol),
            50000m,
            _baseTime);

        _exchangeService.GetCurrentPriceAsync(symbol)
            .Returns(expectedPrice);

        // Setup cache service for CryptoPrice
        _cacheService
            .GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<CryptoPrice>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var factory = callInfo.ArgAt<Func<Task<CryptoPrice>>>(1);
                return factory();
            });

        // Act - Multiple calls should use cache
        var result1 = await _cachedService.GetCurrentPriceAsync(symbol);
        var result2 = await _cachedService.GetCurrentPriceAsync(symbol);

        // Assert
        Assert.Equal(expectedPrice, result1);
        Assert.Equal(expectedPrice, result2);
    }

    [Fact]
    public async Task GetHistoricalPricesAsync_WithRecentData_ShouldUseShortTermCache()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = _baseTime.AddHours(-1); // Recent data
        var endTime = _baseTime;
        var expectedPrices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 49000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, endTime)
        };

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(expectedPrices);

        // Setup cache service to verify it's called with correct options
        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IReadOnlyList<CryptoPrice>>>>()());

        // Act
        var result = await _cachedService.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Assert
        Assert.Equal(expectedPrices, result);

        // Verify cache was called with CacheOptions (advanced caching)
        await _cacheService.Received(1).GetOrSetAsync(
            Arg.Any<string>(),
            Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
            Arg.Any<CacheOptions>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetHistoricalPricesAsync_WithOldData_ShouldUseLongTermCache()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = _baseTime.AddDays(-30); // Old historical data
        var endTime = _baseTime.AddDays(-29);
        var expectedPrices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 45000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 46000m, endTime)
        };

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(expectedPrices);

        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IReadOnlyList<CryptoPrice>>>>()());

        // Act
        var result = await _cachedService.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Assert
        Assert.Equal(expectedPrices, result);

        // Verify long-term caching was applied
        await _cacheService.Received(1).GetOrSetAsync(
            Arg.Any<string>(),
            Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
            Arg.Is<CacheOptions>(opts => opts.Priority == CachePriority.Low),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task WarmUpCacheAsync_WithMultipleSymbols_ShouldPreloadCache()
    {
        // Arrange
        var symbols = new[] { "BTC", "ETH", "ADA" };
        var startTime = _baseTime.AddDays(-1);
        var endTime = _baseTime;

        foreach (var symbol in symbols)
        {
            var price = CryptoPrice.Create(CryptoCurrency.Create(symbol), 1000m, _baseTime);
            _exchangeService.GetCurrentPriceAsync(symbol).Returns(price);

            var historicalPrices = new List<CryptoPrice>
            {
                CryptoPrice.Create(CryptoCurrency.Create(symbol), 900m, startTime),
                CryptoPrice.Create(CryptoCurrency.Create(symbol), 1000m, endTime)
            };
            _exchangeService.GetHistoricalPricesAsync(symbol, Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>())
                .Returns(historicalPrices);
        }

        // Setup cache service for both CryptoPrice and IReadOnlyList<CryptoPrice>
        _cacheService
            .GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<CryptoPrice>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var factory = callInfo.ArgAt<Func<Task<CryptoPrice>>>(1);
                return factory();
            });

        _cacheService
            .GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var factory = callInfo.ArgAt<Func<Task<IReadOnlyList<CryptoPrice>>>>(1);
                return factory();
            });

        // Act
        var cachedService = _cachedService as CachedCryptoExchangeService;
        await cachedService!.WarmUpCacheAsync(symbols, startTime, endTime);

        // Assert - Verify all symbols were processed
        foreach (var symbol in symbols)
        {
            await _exchangeService.Received(1).GetCurrentPriceAsync(symbol);
        }
    }

    [Fact]
    public void InvalidateSymbolCache_ShouldRemoveCacheByTag()
    {
        // Arrange
        var symbol = "BTC";
        var expectedTag = $"symbol:{symbol}";

        // Act
        var cachedService = _cachedService as CachedCryptoExchangeService;
        cachedService!.InvalidateSymbolCache(symbol);

        // Assert
        _cacheService.Received(1).RemoveByTag(expectedTag);
    }

    [Fact]
    public void InvalidateAllPriceCache_ShouldRemoveAllPriceCaches()
    {
        // Act
        var cachedService = _cachedService as CachedCryptoExchangeService;
        cachedService!.InvalidateAllPriceCache();

        // Assert
        _cacheService.Received(1).RemoveByTag("prices");
    }

    [Fact]
    public void GetCacheStatistics_ShouldReturnStatistics()
    {
        // Arrange
        var expectedStats = new CacheStatistics
        {
            HitCount = 100,
            MissCount = 20,
            CurrentCount = 50,
            EstimatedSize = 1024
        };

        _cacheService.GetStatistics().Returns(expectedStats);

        // Act
        var cachedService = _cachedService as CachedCryptoExchangeService;
        var result = cachedService!.GetCacheStatistics();

        // Assert
        Assert.Equal(expectedStats, result);
    }

    [Fact]
    public async Task GetCurrentPriceAsync_WithBackgroundRefresh_ShouldEnableRefresh()
    {
        // Arrange
        var symbol = "BTC";
        var expectedPrice = CryptoPrice.Create(
            CryptoCurrency.Create(symbol),
            50000m,
            _baseTime);

        _exchangeService.GetCurrentPriceAsync(symbol).Returns(expectedPrice);

        // Setup cache to simulate background refresh scenario
        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<CryptoPrice>>>(),
                Arg.Is<CacheOptions>(opts => opts.EnableBackgroundRefresh),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<CryptoPrice>>>()());

        // Act
        var result = await _cachedService.GetCurrentPriceAsync(symbol);

        // Assert
        Assert.Equal(expectedPrice, result);

        // Verify background refresh was enabled
        await _cacheService.Received(1).GetOrSetAsync(
            Arg.Any<string>(),
            Arg.Any<Func<Task<CryptoPrice>>>(),
            Arg.Is<CacheOptions>(opts =>
                opts.EnableBackgroundRefresh &&
                opts.BackgroundRefreshThreshold == 0.6),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetHistoricalPricesAsync_WithMediumAgeData_ShouldUseAppropriateCache()
    {
        // Arrange
        var symbol = "ETH";
        var startTime = _baseTime.AddHours(-12); // Medium age data
        var endTime = _baseTime.AddHours(-6);
        var expectedPrices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 3000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 3100m, endTime)
        };

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(expectedPrices);

        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IReadOnlyList<CryptoPrice>>>>()());

        // Act
        var result = await _cachedService.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Assert
        Assert.Equal(expectedPrices, result);

        // Verify medium-term caching strategy
        await _cacheService.Received(1).GetOrSetAsync(
            Arg.Any<string>(),
            Arg.Any<Func<Task<IReadOnlyList<CryptoPrice>>>>(),
            Arg.Is<CacheOptions>(opts =>
                opts.Priority == CachePriority.Normal &&
                opts.Tags!.Contains("historical")),
            Arg.Any<CancellationToken>());
    }
}

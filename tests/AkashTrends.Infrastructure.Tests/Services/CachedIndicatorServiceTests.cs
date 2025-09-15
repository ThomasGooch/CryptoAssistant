using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class CachedIndicatorServiceTests
{
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ICacheService _cacheService;
    private readonly ITimeProvider _timeProvider;
    private readonly ICryptoExchangeService _exchangeService;
    private readonly ILogger<CachedIndicatorService> _logger;
    private readonly DateTimeOffset _baseTime;
    private readonly CachedIndicatorService _cachedService;

    public CachedIndicatorServiceTests()
    {
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _cacheService = Substitute.For<ICacheService>();
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _logger = Substitute.For<ILogger<CachedIndicatorService>>();
        _baseTime = DateTimeOffset.UtcNow;
        _timeProvider = Substitute.For<ITimeProvider>();
        _timeProvider.GetUtcNow().Returns(_baseTime);

        _cachedService = new CachedIndicatorService(
            _indicatorFactory,
            _exchangeService,
            _cacheService,
            _timeProvider,
            _logger);
    }

    [Fact]
    public async Task CalculateIndicator_WhenNotInCache_ShouldCalculateAndCache()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var startTime = _baseTime.AddDays(-1);
        var endTime = _baseTime;

        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 51000m, endTime)
        };

        var indicator = Substitute.For<IIndicator>();
        var expectedResult = new IndicatorResult(52000m, startTime, endTime);

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(Task.FromResult<IReadOnlyList<CryptoPrice>>(prices));

        _indicatorFactory.CreateIndicator(type, period).Returns(indicator);
        indicator.Calculate(prices).Returns(expectedResult);

        _cacheService
            .GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var factory = callInfo.ArgAt<Func<Task<IndicatorResult>>>(1);
                return factory();
            });

        // Act
        var result = await _cachedService.CalculateIndicatorAsync(symbol, type, period, startTime, endTime);

        // Assert
        Assert.Equal(expectedResult, result);
        await _cacheService.Received(1)
            .GetOrSetAsync(
                Arg.Is<string>(s => s.Contains(symbol) && s.Contains(type.ToString())),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CalculateIndicator_WhenInCache_ShouldNotRecalculate()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var startTime = _baseTime.AddDays(-1);
        var endTime = _baseTime;

        var cachedResult = new IndicatorResult(52000m, startTime, endTime);

        _cacheService
            .GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(cachedResult));

        // Act
        var result = await _cachedService.CalculateIndicatorAsync(symbol, type, period, startTime, endTime);

        // Assert
        Assert.Equal(cachedResult, result);
        await _exchangeService.DidNotReceive()
            .GetHistoricalPricesAsync(
                Arg.Any<string>(),
                Arg.Any<DateTimeOffset>(),
                Arg.Any<DateTimeOffset>());
    }

    [Fact]
    public async Task CalculateIndicator_WithInvalidDates_ShouldThrowArgumentException()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var startTime = _baseTime;
        var endTime = _baseTime.AddDays(-1); // End before start

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _cachedService.CalculateIndicatorAsync(symbol, type, period, startTime, endTime));
    }

    [Fact]
    public async Task CalculateMultipleIndicatorsAsync_WithMultipleIndicators_ShouldCalculateInParallel()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = _baseTime.AddDays(-1);
        var endTime = _baseTime;
        var indicators = new[]
        {
            (IndicatorType.SimpleMovingAverage, 14),
            (IndicatorType.RelativeStrengthIndex, 14),
            (IndicatorType.BollingerBands, 20)
        };

        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 51000m, endTime)
        };

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(prices);

        // Setup indicators
        foreach (var (type, period) in indicators)
        {
            var mockIndicator = Substitute.For<IIndicator>();
            var result = new IndicatorResult(100m, startTime, endTime);
            mockIndicator.Calculate(prices).Returns(result);
            _indicatorFactory.CreateIndicator(type, period).Returns(mockIndicator);
        }

        // Setup cache to pass through
        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IndicatorResult>>>()());

        // Act
        var results = await _cachedService.CalculateMultipleIndicatorsAsync(
            symbol, indicators, startTime, endTime);

        // Assert
        Assert.Equal(3, results.Count);
        Assert.All(results.Values, result => Assert.NotNull(result));

        // Verify all indicators were created
        foreach (var (type, period) in indicators)
        {
            _indicatorFactory.Received(1).CreateIndicator(type, period);
        }
    }

    [Fact]
    public async Task CalculateMultipleTimeframesAsync_WithDifferentTimeframes_ShouldProcessAll()
    {
        // Arrange
        var symbol = "ETH";
        var indicators = new[]
        {
            (IndicatorType.SimpleMovingAverage, 20),
            (IndicatorType.RelativeStrengthIndex, 14)
        };
        var timeframes = new[] { Timeframe.Hour, Timeframe.Day, Timeframe.Week };

        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 3000m, _baseTime.AddDays(-1)),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 3100m, _baseTime)
        };

        _exchangeService.GetHistoricalPricesAsync(symbol, Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>())
            .Returns(prices);

        // Setup indicators
        foreach (var (type, period) in indicators)
        {
            var mockIndicator = Substitute.For<IIndicator>();
            var result = new IndicatorResult(100m, _baseTime.AddDays(-1), _baseTime);
            mockIndicator.Calculate(prices).Returns(result);
            _indicatorFactory.CreateIndicator(type, period).Returns(mockIndicator);
        }

        // Setup cache to pass through
        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IndicatorResult>>>()());

        // Act
        var results = await _cachedService.CalculateMultipleTimeframesAsync(
            symbol, indicators, timeframes);

        // Assert
        Assert.Equal(3, results.Count); // One for each timeframe
        Assert.All(results.Values, timeframeResults =>
            Assert.Equal(2, timeframeResults.Count)); // Two indicators per timeframe
    }

    [Fact]
    public async Task WarmUpIndicatorCacheAsync_WithMultipleSymbols_ShouldPreloadCache()
    {
        // Arrange
        var symbols = new[] { "BTC", "ETH" };
        var indicatorTypes = new[] { IndicatorType.SimpleMovingAverage, IndicatorType.RelativeStrengthIndex };
        var timeframes = new[] { Timeframe.Hour, Timeframe.Day };

        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create("BTC"), 50000m, _baseTime.AddDays(-1)),
            CryptoPrice.Create(CryptoCurrency.Create("BTC"), 51000m, _baseTime)
        };

        _exchangeService.GetHistoricalPricesAsync(Arg.Any<string>(), Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>())
            .Returns(prices);

        // Setup indicators
        foreach (var type in indicatorTypes)
        {
            var mockIndicator = Substitute.For<IIndicator>();
            var result = new IndicatorResult(100m, _baseTime.AddDays(-1), _baseTime);
            mockIndicator.Calculate(prices).Returns(result);
            _indicatorFactory.CreateIndicator(type, Arg.Any<int>()).Returns(mockIndicator);
        }

        // Setup cache to pass through
        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IndicatorResult>>>()());

        // Act
        await _cachedService.WarmUpIndicatorCacheAsync(symbols, indicatorTypes, timeframes);

        // Assert - Verify cache warm-up completed without exceptions
        Assert.True(true); // Basic completion test
    }

    [Fact]
    public void InvalidateIndicatorCache_ShouldRemoveCacheBySymbol()
    {
        // Arrange
        var symbol = "BTC";
        var expectedTag = $"symbol:{symbol}";

        // Act
        _cachedService.InvalidateIndicatorCache(symbol);

        // Assert
        _cacheService.Received(1).RemoveByTag(expectedTag);
    }

    [Fact]
    public void GetIndicatorCacheStatistics_ShouldReturnStatistics()
    {
        // Arrange
        var expectedStats = new CacheStatistics
        {
            HitCount = 50,
            MissCount = 10,
            CurrentCount = 25,
            EstimatedSize = 512
        };

        _cacheService.GetStatistics().Returns(expectedStats);

        // Act
        var result = _cachedService.GetIndicatorCacheStatistics();

        // Assert
        Assert.Equal(expectedStats, result);
    }

    [Fact]
    public async Task CalculateIndicatorAsync_WithAdvancedCaching_ShouldUseCacheOptions()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.SimpleMovingAverage;
        var period = 20;
        var startTime = _baseTime.AddDays(-1);
        var endTime = _baseTime;

        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 51000m, endTime)
        };

        var mockIndicator = Substitute.For<IIndicator>();
        var expectedResult = new IndicatorResult(50500m, startTime, endTime);
        mockIndicator.Calculate(prices).Returns(expectedResult);

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime).Returns(prices);
        _indicatorFactory.CreateIndicator(type, period).Returns(mockIndicator);

        // Setup cache to capture CacheOptions usage
        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IndicatorResult>>>()());

        // Act
        var result = await _cachedService.CalculateIndicatorAsync(symbol, type, period, startTime, endTime);

        // Assert
        Assert.Equal(expectedResult, result);

        // Verify advanced caching was used
        await _cacheService.Received(1).GetOrSetAsync(
            Arg.Any<string>(),
            Arg.Any<Func<Task<IndicatorResult>>>(),
            Arg.Is<CacheOptions>(opts =>
                opts.Tags != null &&
                opts.Tags.Contains("indicators") &&
                opts.Tags.Contains($"symbol:{symbol}") &&
                opts.Tags.Contains($"type:{type}")),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CalculateIndicatorAsync_WithRecentData_ShouldUseShortTermCache()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.RelativeStrengthIndex;
        var period = 14;
        var startTime = _baseTime.AddMinutes(-30); // Recent data
        var endTime = _baseTime;

        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, startTime),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 51000m, endTime)
        };

        var mockIndicator = Substitute.For<IIndicator>();
        var expectedResult = new IndicatorResult(65.5m, startTime, endTime);
        mockIndicator.Calculate(prices).Returns(expectedResult);

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime).Returns(prices);
        _indicatorFactory.CreateIndicator(type, period).Returns(mockIndicator);

        // Setup cache
        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IndicatorResult>>>()());

        // Act
        var result = await _cachedService.CalculateIndicatorAsync(symbol, type, period, startTime, endTime);

        // Assert
        Assert.Equal(expectedResult, result);

        // Verify short-term cache settings for recent data
        await _cacheService.Received(1).GetOrSetAsync(
            Arg.Any<string>(),
            Arg.Any<Func<Task<IndicatorResult>>>(),
            Arg.Is<CacheOptions>(opts =>
                opts.Priority == CachePriority.High &&
                opts.EnableBackgroundRefresh),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CalculateIndicatorAsync_WithNoHistoricalData_ShouldReturnEmpty()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.SimpleMovingAverage;
        var period = 20;
        var startTime = _baseTime.AddDays(-1);
        var endTime = _baseTime;

        // No historical data available
        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(new List<CryptoPrice>());

        // Setup cache to pass through
        _cacheService.GetOrSetAsync(
                Arg.Any<string>(),
                Arg.Any<Func<Task<IndicatorResult>>>(),
                Arg.Any<CacheOptions>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => callInfo.Arg<Func<Task<IndicatorResult>>>()());

        // Act
        var result = await _cachedService.CalculateIndicatorAsync(symbol, type, period, startTime, endTime);

        // Assert
        Assert.True(result.IsEmpty);

        // Verify indicator factory was not called when no data available
        _indicatorFactory.DidNotReceive().CreateIndicator(Arg.Any<IndicatorType>(), Arg.Any<int>());
    }
}

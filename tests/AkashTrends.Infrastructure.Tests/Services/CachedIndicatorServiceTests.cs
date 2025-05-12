using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.Services;
using NSubstitute;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class CachedIndicatorServiceTests
{
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ICacheService _cacheService;
    private readonly ITimeProvider _timeProvider;
    private readonly ICryptoExchangeService _exchangeService;
    private readonly DateTimeOffset _baseTime;
    private readonly CachedIndicatorService _cachedService;

    public CachedIndicatorServiceTests()
    {
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _cacheService = Substitute.For<ICacheService>();
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _baseTime = DateTimeOffset.UtcNow;
        _timeProvider = Substitute.For<ITimeProvider>();
        _timeProvider.GetUtcNow().Returns(_baseTime);

        _cachedService = new CachedIndicatorService(
            _indicatorFactory,
            _exchangeService,
            _cacheService,
            _timeProvider);
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
                Arg.Any<TimeSpan>())
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
                Arg.Any<TimeSpan>());
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
                Arg.Any<TimeSpan>())
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
}

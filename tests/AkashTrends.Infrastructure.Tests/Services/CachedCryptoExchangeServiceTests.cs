using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.Services;
using NSubstitute;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class CachedCryptoExchangeServiceTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly ICacheService _cacheService;
    private readonly TimeProvider _timeProvider;
    private readonly ICryptoExchangeService _cachedService;
    private readonly DateTimeOffset _baseTime;

    public CachedCryptoExchangeServiceTests()
    {
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _cacheService = Substitute.For<ICacheService>();
        _baseTime = DateTimeOffset.UtcNow;
        _timeProvider = Substitute.For<TimeProvider>();
        _timeProvider.GetUtcNow().Returns(_baseTime);
        _cachedService = new CachedCryptoExchangeService(_exchangeService, _cacheService, _timeProvider);
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
                Arg.Any<TimeSpan>())
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
                Arg.Any<TimeSpan>());
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
                Arg.Any<TimeSpan>())
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
}

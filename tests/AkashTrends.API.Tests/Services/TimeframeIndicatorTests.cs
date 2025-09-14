using AkashTrends.API.Hubs;
using AkashTrends.API.Services;
using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace AkashTrends.API.Tests.Services;

public class TimeframeIndicatorTests
{
    private readonly IHubContext<PriceUpdateHub> _mockHubContext;
    private readonly ICryptoExchangeService _mockExchangeService;
    private readonly IIndicatorFactory _mockIndicatorFactory;
    private readonly IClientProxy _mockClientProxy;
    private readonly ILogger<IndicatorUpdateService> _mockLogger;
    private readonly IIndicator _mockIndicator;
    private readonly IndicatorUpdateService _service;

    public TimeframeIndicatorTests()
    {
        _mockHubContext = Substitute.For<IHubContext<PriceUpdateHub>>();
        _mockExchangeService = Substitute.For<ICryptoExchangeService>();
        _mockIndicatorFactory = Substitute.For<IIndicatorFactory>();
        _mockIndicator = Substitute.For<IIndicator>();
        _mockClientProxy = Substitute.For<IClientProxy>();
        _mockLogger = Substitute.For<ILogger<IndicatorUpdateService>>();

        _mockHubContext.Clients.All.Returns(_mockClientProxy);
        _mockIndicatorFactory.CreateIndicator(Arg.Any<IndicatorType>(), Arg.Any<int>())
            .Returns(_mockIndicator);

        _service = new IndicatorUpdateService(
            _mockHubContext,
            _mockExchangeService,
            _mockIndicatorFactory,
            _mockLogger);
    }

    [Theory]
    [InlineData(Timeframe.Minute, 60)]
    [InlineData(Timeframe.Hour, 24)]
    [InlineData(Timeframe.Day, 7)]
    public async Task Should_UseCorrectTimeframe_When_CalculatingIndicator(Timeframe timeframe, int expectedDataPoints)
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;

        var prices = Enumerable.Range(0, expectedDataPoints)
            .Select(i => CryptoPrice.Create(
                CryptoCurrency.Create(symbol),
                50000m + i * 100m,
                DateTimeOffset.UtcNow.AddMinutes(-i * (int)timeframe)))
            .ToList();

        var indicatorResult = new IndicatorResult(
            50000m,
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow);

        _mockExchangeService.GetHistoricalPricesAsync(
            Arg.Is(symbol),
            Arg.Any<DateTimeOffset>(),
            Arg.Any<DateTimeOffset>())
            .Returns(prices);

        _mockIndicator.Calculate(Arg.Any<IReadOnlyList<CryptoPrice>>())
            .Returns(indicatorResult);

        // Act
        await _service.SubscribeToIndicator(symbol, indicatorType, period, timeframe);
        await _service.UpdateIndicatorsAsync();

        // Assert
        await _mockClientProxy.Received(1)
            .SendCoreAsync(
                "ReceiveIndicatorUpdate",
                Arg.Is<object[]>(args =>
                    args[0].ToString() == symbol &&
                    (IndicatorType)args[1] == indicatorType &&
                    (decimal)args[2] == 50000m &&
                    (Timeframe)args[3] == timeframe),
                default);

        // Verify we're using the correct timeframe for historical data
        await _mockExchangeService.Received(1).GetHistoricalPricesAsync(
            Arg.Is(symbol),
            // Verify the time range is appropriate for the timeframe
            Arg.Is<DateTimeOffset>(dt => dt <= DateTimeOffset.UtcNow.AddMinutes(-(int)timeframe * period)),
            Arg.Any<DateTimeOffset>());
    }

    [Fact]
    public async Task Should_UseDefaultTimeframe_When_NotSpecified()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;

        var prices = Enumerable.Range(0, 24)
            .Select(i => CryptoPrice.Create(
                CryptoCurrency.Create(symbol),
                50000m + i * 100m,
                DateTimeOffset.UtcNow.AddHours(-i)))
            .ToList();

        var indicatorResult = new IndicatorResult(
            50000m,
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow);

        _mockExchangeService.GetHistoricalPricesAsync(
            Arg.Is(symbol),
            Arg.Any<DateTimeOffset>(),
            Arg.Any<DateTimeOffset>())
            .Returns(prices);

        _mockIndicator.Calculate(Arg.Any<IReadOnlyList<CryptoPrice>>())
            .Returns(indicatorResult);

        // Act
        await _service.SubscribeToIndicator(symbol, indicatorType, period);
        await _service.UpdateIndicatorsAsync();

        // Assert
        await _mockClientProxy.Received(1)
            .SendCoreAsync(
                "ReceiveIndicatorUpdate",
                Arg.Is<object[]>(args =>
                    args[0].ToString() == symbol &&
                    (IndicatorType)args[1] == indicatorType &&
                    (decimal)args[2] == 50000m &&
                    (Timeframe)args[3] == Timeframe.Hour),
                default);
    }

    [Fact]
    public async Task Should_UnsubscribeFromSpecificTimeframe_Only()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;

        var prices = Enumerable.Range(0, 24)
            .Select(i => CryptoPrice.Create(
                CryptoCurrency.Create(symbol),
                50000m + i * 100m,
                DateTimeOffset.UtcNow.AddHours(-i)))
            .ToList();

        var indicatorResult = new IndicatorResult(
            50000m,
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow);

        _mockExchangeService.GetHistoricalPricesAsync(
            Arg.Is(symbol),
            Arg.Any<DateTimeOffset>(),
            Arg.Any<DateTimeOffset>())
            .Returns(prices);

        _mockIndicator.Calculate(Arg.Any<IReadOnlyList<CryptoPrice>>())
            .Returns(indicatorResult);

        // Act - Subscribe to two timeframes, then unsubscribe from one
        await _service.SubscribeToIndicator(symbol, indicatorType, period, Timeframe.Hour);
        await _service.SubscribeToIndicator(symbol, indicatorType, period, Timeframe.Day);
        await _service.UnsubscribeFromIndicator(symbol, indicatorType, Timeframe.Hour);
        await _service.UpdateIndicatorsAsync();

        // Assert - Only the Day timeframe should be calculated
        await _mockClientProxy.Received(1)
            .SendCoreAsync(
                "ReceiveIndicatorUpdate",
                Arg.Is<object[]>(args =>
                    args[0].ToString() == symbol &&
                    (IndicatorType)args[1] == indicatorType &&
                    (decimal)args[2] == 50000m &&
                    (Timeframe)args[3] == Timeframe.Day),
                default);
    }
}

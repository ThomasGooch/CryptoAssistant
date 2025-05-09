using AkashTrends.API.Hubs;
using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using NSubstitute;
using Xunit;

namespace AkashTrends.API.Tests.Hubs;

public class PriceUpdateHubTests
{
    private readonly IHubCallerClients _mockClients;
    private readonly IClientProxy _mockClientProxy;
    private readonly ICryptoExchangeService _mockExchangeService;
    private readonly IIndicatorUpdateService _mockIndicatorService;
    private readonly PriceUpdateHub _hub;

    public PriceUpdateHubTests()
    {
        _mockClients = Substitute.For<IHubCallerClients>();
        _mockClientProxy = Substitute.For<IClientProxy>();
        _mockExchangeService = Substitute.For<ICryptoExchangeService>();
        _mockIndicatorService = Substitute.For<IIndicatorUpdateService>();
        _mockClients.All.Returns(_mockClientProxy);

        _hub = new PriceUpdateHub(_mockExchangeService, _mockIndicatorService)
        {
            Clients = _mockClients
        };
    }

    [Fact]
    public async Task Should_SubscribeToSymbol_When_ValidSymbolProvided()
    {
        // Arrange
        var symbol = "BTC";
        var price = CryptoPrice.Create(
            CryptoCurrency.Create(symbol),
            50000m,
            DateTimeOffset.UtcNow);

        _mockExchangeService.GetCurrentPriceAsync(symbol)
            .Returns(price);

        // Act
        await _hub.SubscribeToSymbol(symbol);

        // Assert
        await _mockClientProxy.Received(1)
            .SendCoreAsync(
                "ReceivePriceUpdate",
                Arg.Is<object[]>(args => 
                    args[0].ToString() == symbol &&
                    (decimal)args[1] == 50000m),
                default);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task Should_ThrowArgumentException_When_InvalidSymbolProvided(string symbol)
    {
        // Act
        var act = () => _hub.SubscribeToSymbol(symbol);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task Should_UnsubscribeFromSymbol_When_ValidSymbolProvided()
    {
        // Arrange
        var symbol = "BTC";

        // Act
        await _hub.UnsubscribeFromSymbol(symbol);

        // Assert
        // Verification will be added once we implement the unsubscribe logic
        await Task.CompletedTask;
    }

    [Fact]
    public async Task Should_SubscribeToIndicator_When_ValidParametersProvided()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;

        // Act
        await _hub.SubscribeToIndicator(symbol, indicatorType, period);

        // Assert
        await _mockIndicatorService.Received(1)
            .SubscribeToIndicator(
                Arg.Is(symbol),
                Arg.Is(indicatorType),
                Arg.Is(period));
        
        await _mockIndicatorService.Received(1)
            .UpdateIndicatorsAsync();
    }

    [Fact]
    public async Task Should_SubscribeToIndicator_WithTimeframe_When_ValidParametersProvided()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var timeframe = Timeframe.Hour;

        // Act
        await _hub.SubscribeToIndicatorWithTimeframe(symbol, indicatorType, period, timeframe);

        // Assert
        await _mockIndicatorService.Received(1)
            .SubscribeToIndicator(
                Arg.Is(symbol),
                Arg.Is(indicatorType),
                Arg.Is(period),
                Arg.Is(timeframe));
        
        await _mockIndicatorService.Received(1)
            .UpdateIndicatorsAsync();
    }

    [Theory]
    [InlineData("", IndicatorType.SimpleMovingAverage, 14)]
    [InlineData(" ", IndicatorType.SimpleMovingAverage, 14)]
    [InlineData(null, IndicatorType.SimpleMovingAverage, 14)]
    public async Task Should_ThrowArgumentException_When_InvalidSymbolProvidedForIndicator(
        string symbol, IndicatorType indicatorType, int period)
    {
        // Act
        var act = () => _hub.SubscribeToIndicator(symbol, indicatorType, period);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Theory]
    [InlineData("BTC", IndicatorType.SimpleMovingAverage, 0)]
    [InlineData("BTC", IndicatorType.SimpleMovingAverage, -1)]
    public async Task Should_ThrowArgumentException_When_InvalidPeriodProvidedForIndicator(
        string symbol, IndicatorType indicatorType, int period)
    {
        // Act
        var act = () => _hub.SubscribeToIndicator(symbol, indicatorType, period);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task Should_ThrowArgumentException_When_InvalidTimeframeProvidedForIndicator()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var invalidTimeframe = (Timeframe)999;

        // Act
        var act = () => _hub.SubscribeToIndicatorWithTimeframe(symbol, indicatorType, period, invalidTimeframe);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task Should_UnsubscribeFromIndicator_When_ValidParametersProvided()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;

        // Act
        await _hub.UnsubscribeFromIndicator(symbol, indicatorType);

        // Assert
        await _mockIndicatorService.Received(1)
            .UnsubscribeFromIndicator(
                Arg.Is(symbol),
                Arg.Is(indicatorType));
    }

    [Fact]
    public async Task Should_UnsubscribeFromIndicator_WithTimeframe_When_ValidParametersProvided()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var timeframe = Timeframe.Hour;

        // Act
        await _hub.UnsubscribeFromIndicatorWithTimeframe(symbol, indicatorType, timeframe);

        // Assert
        await _mockIndicatorService.Received(1)
            .UnsubscribeFromIndicator(
                Arg.Is(symbol),
                Arg.Is(indicatorType),
                Arg.Is(timeframe));
    }
}

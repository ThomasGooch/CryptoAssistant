using AkashTrends.API.Hubs;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.CalculateIndicator;
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
    private readonly IQueryDispatcher _mockQueryDispatcher;
    private readonly PriceUpdateHub _hub;

    public PriceUpdateHubTests()
    {
        _mockClientProxy = Substitute.For<IClientProxy>();
        _mockClients = Substitute.For<IHubCallerClients>();
        _mockExchangeService = Substitute.For<ICryptoExchangeService>();
        _mockIndicatorService = Substitute.For<IIndicatorUpdateService>();
        _mockQueryDispatcher = Substitute.For<IQueryDispatcher>();

        // Setup SignalR hub context
        var mockCaller = Substitute.For<ISingleClientProxy>();
        mockCaller.SendCoreAsync(Arg.Any<string>(), Arg.Any<object[]>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        _mockClients.All.Returns(_mockClientProxy);
        _mockClients.Caller.Returns(mockCaller);

        var mockContext = Substitute.For<HubCallerContext>();
        mockContext.ConnectionId.Returns("test-connection-id");

        // Setup default successful responses
        _mockExchangeService.GetCurrentPriceAsync(Arg.Any<string>())
            .Returns(callInfo => CryptoPrice.Create(
                CryptoCurrency.Create(callInfo.Arg<string>()),
                50000m,
                DateTimeOffset.UtcNow));

        _mockQueryDispatcher
            .Dispatch<CalculateIndicatorQuery, CalculateIndicatorResult>(Arg.Any<CalculateIndicatorQuery>())
            .Returns(callInfo =>
            {
                var query = callInfo.Arg<CalculateIndicatorQuery>();
                return new CalculateIndicatorResult
                {
                    Symbol = query.Symbol,
                    Type = query.Type,
                    Value = 50000m,
                    StartTime = DateTimeOffset.UtcNow.AddDays(-query.Period),
                    EndTime = DateTimeOffset.UtcNow
                };
            });

        _hub = new PriceUpdateHub(_mockExchangeService, _mockIndicatorService, _mockQueryDispatcher)
        {
            Clients = _mockClients,
            Context = mockContext
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

        _mockExchangeService.GetCurrentPriceAsync(symbol.ToUpperInvariant())
            .Returns(price);

        // Act
        await _hub.SubscribeToSymbol(symbol);

        // Assert
        await _mockClients.Caller.Received(1)
            .SendCoreAsync(
                "ReceivePriceUpdate",
                Arg.Is<object[]>(args =>
                    args[0].ToString() == symbol.ToUpperInvariant() &&
                    (decimal)args[1] == 50000m),
                default);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   ")]
    public async Task Should_ThrowArgumentException_When_InvalidSymbolProvided(string symbol)
    {
        // Act
        var act = () => _hub.SubscribeToSymbol(symbol);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("Symbol cannot be empty (Parameter 'symbol')");
    }

    [Fact]
    public async Task Should_UnsubscribeFromSymbol_When_ValidSymbolProvided()
    {
        // Arrange
        var symbol = "BTC";

        // Act
        await _hub.UnsubscribeFromSymbol(symbol);

        // Assert
        // No exception should be thrown
        await Task.CompletedTask;
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task Should_ThrowArgumentException_When_UnsubscribingFromSymbolWithInvalidSymbol(string symbol)
    {
        // Act
        var act = () => _hub.UnsubscribeFromSymbol(symbol);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("Symbol cannot be empty (Parameter 'symbol')");
    }

    [Fact]
    public async Task Should_SubscribeToIndicator_When_ValidParametersProvided()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;

        var result = new CalculateIndicatorResult
        {
            Symbol = symbol,
            Type = indicatorType,
            Value = 50000m,
            StartTime = DateTimeOffset.UtcNow.AddDays(-period),
            EndTime = DateTimeOffset.UtcNow
        };

        _mockQueryDispatcher
            .Dispatch<CalculateIndicatorQuery, CalculateIndicatorResult>(Arg.Any<CalculateIndicatorQuery>())
            .Returns(result);

        // Act
        await _hub.SubscribeToIndicator(symbol, indicatorType, period);

        // Assert
        await _mockIndicatorService.Received(1)
            .SubscribeToIndicator(
                Arg.Is(symbol.ToUpperInvariant()),
                Arg.Is(indicatorType),
                Arg.Is(period));

        await _mockIndicatorService.Received(1)
            .UpdateIndicatorsAsync();

        await _mockClients.Caller.Received(1)
            .SendCoreAsync(
                "ReceiveIndicatorUpdate",
                Arg.Is<object[]>(args =>
                    args[0].ToString() == symbol.ToUpperInvariant() &&
                    (IndicatorType)args[1] == indicatorType &&
                    (decimal)args[2] == 50000m),
                default);
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
    public async Task Should_ThrowArgumentException_When_InvalidSymbolProvidedForIndicator(
        string symbol, IndicatorType indicatorType, int period)
    {
        // Act
        var act = () => _hub.SubscribeToIndicator(symbol, indicatorType, period);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("Symbol cannot be empty (Parameter 'symbol')");
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
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("Period must be greater than 0 (Parameter 'period')");
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
            .UnsubscribeFromIndicator(symbol.ToUpperInvariant(), indicatorType);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task Should_ThrowArgumentException_When_UnsubscribingFromIndicatorWithInvalidSymbol(string symbol)
    {
        // Arrange
        var indicatorType = IndicatorType.SimpleMovingAverage;

        // Act
        var act = () => _hub.UnsubscribeFromIndicator(symbol, indicatorType);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
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
                Arg.Is(symbol.ToUpperInvariant()),
                Arg.Is(indicatorType),
                Arg.Is(timeframe));
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task Should_ThrowArgumentException_When_UnsubscribingFromIndicatorWithTimeframeWithInvalidSymbol(string symbol)
    {
        // Arrange
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var timeframe = Timeframe.Hour;

        // Act
        var act = () => _hub.UnsubscribeFromIndicatorWithTimeframe(symbol, indicatorType, timeframe);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>().WithMessage("Symbol cannot be empty (Parameter 'symbol')");
    }

    [Fact]
    public async Task Should_ThrowArgumentException_When_UnsubscribingFromIndicatorWithInvalidTimeframe()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var invalidTimeframe = (Timeframe)999;

        // Act
        var act = () => _hub.UnsubscribeFromIndicatorWithTimeframe(symbol, indicatorType, invalidTimeframe);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }
}

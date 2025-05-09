using AkashTrends.API.Hubs;
using AkashTrends.API.Services;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace AkashTrends.API.Tests.Services;

public class IndicatorUpdateServiceTests : IAsyncDisposable
{
    private readonly IHubContext<PriceUpdateHub> _mockHubContext;
    private readonly ICryptoExchangeService _mockExchangeService;
    private readonly IIndicatorFactory _mockIndicatorFactory;
    private readonly IClientProxy _mockClientProxy;
    private readonly ILogger<IndicatorUpdateService> _mockLogger;
    private readonly IIndicator _mockIndicator;
    private readonly IndicatorUpdateService _service;
    private readonly CancellationTokenSource _cts;

    public IndicatorUpdateServiceTests()
    {
        _cts = new CancellationTokenSource();
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

    public ValueTask DisposeAsync()
    {
        _cts.Cancel();
        _cts.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task Should_CalculateIndicator_When_PriceUpdated()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(
                CryptoCurrency.Create(symbol),
                50000m,
                DateTimeOffset.UtcNow)
        };

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
        await _service.UpdateIndicatorsForTestingAsync();

        // Assert
        await _mockClientProxy.Received(1)
            .SendCoreAsync(
                "ReceiveIndicatorUpdate",
                Arg.Is<object[]>(args => 
                    args[0].ToString() == symbol &&
                    (IndicatorType)args[1] == indicatorType &&
                    (decimal)args[2] == 50000m),
                default);
    }

    [Fact]
    public async Task Should_NotCalculateIndicator_When_Unsubscribed()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;

        // Act
        await _service.SubscribeToIndicator(symbol, indicatorType, period);
        await _service.UnsubscribeFromIndicator(symbol, indicatorType);
        await _service.UpdateIndicatorsForTestingAsync();

        // Assert
        await _mockClientProxy.DidNotReceive()
            .SendCoreAsync(
                "ReceiveIndicatorUpdate",
                Arg.Any<object[]>(),
                default);
    }

    [Fact]
    public async Task Should_LogError_When_IndicatorCalculationFails()
    {
        // Arrange
        var symbol = "BTC";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var exception = new Exception("Test error");

        _mockExchangeService.GetHistoricalPricesAsync(
            Arg.Any<string>(),
            Arg.Any<DateTimeOffset>(),
            Arg.Any<DateTimeOffset>())
            .Returns(Task.FromException<IReadOnlyList<CryptoPrice>>(exception));

        // Act
        await _service.SubscribeToIndicator(symbol, indicatorType, period);
        await _service.UpdateIndicatorsForTestingAsync();

        // Assert
        _mockLogger.Received(1).Log(
            LogLevel.Error,
            Arg.Any<EventId>(),
            Arg.Is<object>(o => o.ToString()!.Contains("Failed to calculate indicator")),
            Arg.Is<Exception>(ex => ex == exception),
            Arg.Any<Func<object, Exception?, string>>());
    }
}

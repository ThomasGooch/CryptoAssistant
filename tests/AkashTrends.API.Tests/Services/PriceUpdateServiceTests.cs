using AkashTrends.API.Hubs;
using AkashTrends.API.Services;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace AkashTrends.API.Tests.Services;

public class PriceUpdateServiceTests : IAsyncDisposable
{
    private readonly IHubContext<PriceUpdateHub> _mockHubContext;
    private readonly ICryptoExchangeService _mockExchangeService;
    private readonly ITimeProvider _mockTimeProvider;
    private readonly IIndicatorUpdateService _mockIndicatorService;
    private readonly IClientProxy _mockClientProxy;
    private readonly ILogger<PriceUpdateService> _mockLogger;
    private readonly PriceUpdateService _service;
    private readonly CancellationTokenSource _cts;

    public PriceUpdateServiceTests()
    {
        _cts = new CancellationTokenSource();
        _mockHubContext = Substitute.For<IHubContext<PriceUpdateHub>>();
        _mockExchangeService = Substitute.For<ICryptoExchangeService>();
        _mockTimeProvider = Substitute.For<ITimeProvider>();
        _mockIndicatorService = Substitute.For<IIndicatorUpdateService>();
        _mockClientProxy = Substitute.For<IClientProxy>();
        _mockLogger = Substitute.For<ILogger<PriceUpdateService>>();

        _mockHubContext.Clients.All.Returns(_mockClientProxy);

        _service = new PriceUpdateService(
            _mockHubContext,
            _mockExchangeService,
            _mockTimeProvider,
            _mockIndicatorService,
            _mockLogger);
    }

    public async ValueTask DisposeAsync()
    {
        _cts.Cancel();
        _cts.Dispose();
    }

    [Fact]
    public async Task Should_BroadcastPriceUpdate_When_SymbolIsSubscribed()
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
        await _service.SubscribeToSymbol(symbol);
        await _service.UpdatePricesForTestingAsync();

        // Assert
        await _mockClientProxy.Received(1)
            .SendCoreAsync(
                "ReceivePriceUpdate",
                Arg.Is<object[]>(args => 
                    args[0].ToString() == symbol &&
                    (decimal)args[1] == 50000m),
                default);
    }

    [Fact]
    public async Task Should_NotBroadcastPriceUpdate_When_SymbolIsUnsubscribed()
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
        await _service.SubscribeToSymbol(symbol);
        await _service.UnsubscribeFromSymbol(symbol);
        await _service.UpdatePricesForTestingAsync();

        // Assert
        await _mockClientProxy.DidNotReceive()
            .SendCoreAsync(
                "ReceivePriceUpdate",
                Arg.Any<object[]>(),
                default);
    }

    [Fact]
    public async Task Should_LogError_When_PriceUpdateFails()
    {
        // Arrange
        var symbol = "BTC";
        var exception = new Exception("Test error");

        _mockExchangeService.GetCurrentPriceAsync(symbol)
            .Returns(Task.FromException<CryptoPrice>(exception));

        // Act
        await _service.SubscribeToSymbol(symbol);
        await _service.UpdatePricesForTestingAsync();

        // Assert
        _mockLogger.Received(1).Log(
            LogLevel.Error,
            Arg.Any<EventId>(),
            Arg.Is<object>(o => o.ToString()!.Contains("Failed to update price")),
            Arg.Is<Exception>(ex => ex == exception),
            Arg.Any<Func<object, Exception?, string>>());
    }
}

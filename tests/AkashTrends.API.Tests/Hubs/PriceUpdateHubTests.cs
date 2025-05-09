using AkashTrends.API.Hubs;
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
    private readonly PriceUpdateHub _hub;

    public PriceUpdateHubTests()
    {
        _mockClients = Substitute.For<IHubCallerClients>();
        _mockClientProxy = Substitute.For<IClientProxy>();
        _mockExchangeService = Substitute.For<ICryptoExchangeService>();
        _mockClients.All.Returns(_mockClientProxy);

        _hub = new PriceUpdateHub(_mockExchangeService)
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
}

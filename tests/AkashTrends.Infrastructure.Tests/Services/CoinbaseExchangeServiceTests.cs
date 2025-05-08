using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using AkashTrends.Infrastructure.Services;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class CoinbaseExchangeServiceTests
{
    private readonly ICoinbaseApiClient _apiClient;
    private readonly CoinbaseExchangeService _service;

    public CoinbaseExchangeServiceTests()
    {
        _apiClient = Substitute.For<ICoinbaseApiClient>();
        _service = new CoinbaseExchangeService(_apiClient);
    }

    [Fact]
    public async Task Should_ReturnPrice_When_GetCurrentPriceWithValidSymbol()
    {
        // Arrange
        var symbol = "BTC";
        var price = 50000.00m;
        var timestamp = DateTimeOffset.UtcNow;

        var priceData = new CoinbasePriceData
        {
            Price = price,
            Currency = "USD",
            Timestamp = timestamp
        };

        _apiClient.GetPriceAsync(symbol)
            .Returns(Task.FromResult(priceData));

        // Act
        var result = await _service.GetCurrentPriceAsync(symbol);

        // Assert
        result.Currency.Symbol.Should().Be(symbol);
        result.Value.Should().Be(price);
        result.Timestamp.Should().Be(timestamp);
    }

    [Fact]
    public async Task Should_ThrowExchangeException_When_GetCurrentPriceWithInvalidSymbol()
    {
        // Arrange
        var symbol = "INVALID";
        var errorMessage = "Invalid symbol";

        _apiClient.GetPriceAsync(symbol)
            .Returns(Task.FromException<CoinbasePriceData>(new ExchangeException(errorMessage)));

        // Act
        var act = () => _service.GetCurrentPriceAsync(symbol);

        // Assert
        await act.Should().ThrowAsync<ExchangeException>()
            .WithMessage(errorMessage);
    }

    [Fact]
    public async Task Should_ReturnPrices_When_GetHistoricalPricesWithValidParameters()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = DateTimeOffset.UtcNow.AddDays(-1);
        var endTime = DateTimeOffset.UtcNow;

        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 49000.00m, startTime.AddHours(1)),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000.00m, startTime.AddHours(2))
        };

        _apiClient.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(Task.FromResult<IReadOnlyList<CryptoPrice>>(prices));

        // Act
        var result = await _service.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Assert
        result.Should().BeEquivalentTo(prices, options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task Should_ThrowArgumentException_When_GetHistoricalPricesWithInvalidTimeRange()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = DateTimeOffset.UtcNow;
        var endTime = startTime.AddDays(-1); // End time before start time

        // Act
        var act = () => _service.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }
}

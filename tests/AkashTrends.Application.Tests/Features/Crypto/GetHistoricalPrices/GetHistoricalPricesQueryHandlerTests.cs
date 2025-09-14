using AkashTrends.Application.Features.Crypto.GetHistoricalPrices;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace AkashTrends.Application.Tests.Features.Crypto.GetHistoricalPrices;

public class GetHistoricalPricesQueryHandlerTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly GetHistoricalPricesQueryHandler _handler;

    public GetHistoricalPricesQueryHandlerTests()
    {
        // Arrange
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _handler = new GetHistoricalPricesQueryHandler(_exchangeService);
    }

    [Fact]
    public async Task Handle_ValidParameters_ReturnsHistoricalPrices()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = DateTimeOffset.UtcNow.AddDays(-7);
        var endTime = DateTimeOffset.UtcNow;

        var query = new GetHistoricalPricesQuery
        {
            Symbol = symbol,
            StartTime = startTime,
            EndTime = endTime
        };

        var expectedPrices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, startTime.AddDays(1)),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 51000m, startTime.AddDays(2)),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 52000m, startTime.AddDays(3))
        };

        _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime)
            .Returns(expectedPrices);

        // Act
        var result = await _handler.Handle(query);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedPrices.Count, result.Prices.Count);
        Assert.Equal(symbol, result.Symbol);
        Assert.Equal(startTime, result.StartTime);
        Assert.Equal(endTime, result.EndTime);

        for (int i = 0; i < expectedPrices.Count; i++)
        {
            Assert.Equal(expectedPrices[i].Value, result.Prices[i].Price);
            Assert.Equal(expectedPrices[i].Timestamp, result.Prices[i].Timestamp);
        }
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Handle_InvalidSymbol_ThrowsValidationException(string invalidSymbol)
    {
        // Arrange
        var query = new GetHistoricalPricesQuery
        {
            Symbol = invalidSymbol,
            StartTime = DateTimeOffset.UtcNow.AddDays(-7),
            EndTime = DateTimeOffset.UtcNow
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _handler.Handle(query));
    }

    [Fact]
    public async Task Handle_StartTimeAfterEndTime_ThrowsValidationException()
    {
        // Arrange
        var startTime = DateTimeOffset.UtcNow;
        var endTime = startTime.AddDays(-1); // End time before start time

        var query = new GetHistoricalPricesQuery
        {
            Symbol = "BTC",
            StartTime = startTime,
            EndTime = endTime
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _handler.Handle(query));
    }

    [Fact]
    public async Task Handle_ExchangeServiceThrowsException_PropagatesException()
    {
        // Arrange
        var query = new GetHistoricalPricesQuery
        {
            Symbol = "BTC",
            StartTime = DateTimeOffset.UtcNow.AddDays(-7),
            EndTime = DateTimeOffset.UtcNow
        };

        var expectedException = new ExchangeException("API error");
        _exchangeService.GetHistoricalPricesAsync(
                Arg.Any<string>(),
                Arg.Any<DateTimeOffset>(),
                Arg.Any<DateTimeOffset>())
            .Throws(expectedException);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ExchangeException>(() => _handler.Handle(query));
        Assert.Same(expectedException, exception);
    }
}

using AkashTrends.Application.Features.Crypto.GetCurrentPrice;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace AkashTrends.Application.Tests.Features.Crypto.GetCurrentPrice;

public class GetCurrentPriceQueryHandlerTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly GetCurrentPriceQueryHandler _handler;

    public GetCurrentPriceQueryHandlerTests()
    {
        // Arrange
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _handler = new GetCurrentPriceQueryHandler(_exchangeService);
    }

    [Fact]
    public async Task Handle_ValidSymbol_ReturnsCurrentPrice()
    {
        // Arrange
        var query = new GetCurrentPriceQuery { Symbol = "BTC" };
        var expectedPrice = CryptoPrice.Create(
            CryptoCurrency.Create("BTC"), 
            50000.00m, 
            DateTimeOffset.UtcNow);
        
        _exchangeService.GetCurrentPriceAsync("BTC").Returns(expectedPrice);

        // Act
        var result = await _handler.Handle(query);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("BTC", result.Symbol);
        Assert.Equal(50000.00m, result.Price);
        Assert.Equal(expectedPrice.Timestamp, result.Timestamp);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task Handle_InvalidSymbol_ThrowsValidationException(string invalidSymbol)
    {
        // Arrange
        var query = new GetCurrentPriceQuery { Symbol = invalidSymbol };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _handler.Handle(query));
    }

    [Fact]
    public async Task Handle_ExchangeServiceThrowsException_PropagatesException()
    {
        // Arrange
        var query = new GetCurrentPriceQuery { Symbol = "BTC" };
        var expectedException = new ExchangeException("API error");
        
        _exchangeService.GetCurrentPriceAsync("BTC").Throws(expectedException);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ExchangeException>(() => _handler.Handle(query));
        Assert.Same(expectedException, exception);
    }
}

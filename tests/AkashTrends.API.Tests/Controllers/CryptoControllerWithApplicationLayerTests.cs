using AkashTrends.API.Controllers;
using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.GetCurrentPrice;
using AkashTrends.Application.Features.Crypto.GetHistoricalPrices;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace AkashTrends.API.Tests.Controllers;

public class CryptoControllerWithApplicationLayerTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ILogger<CryptoController> _logger;
    private readonly IQueryDispatcher _queryDispatcher;
    private readonly CryptoController _controller;

    public CryptoControllerWithApplicationLayerTests()
    {
        // Arrange
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _logger = Substitute.For<ILogger<CryptoController>>();
        _queryDispatcher = Substitute.For<IQueryDispatcher>();
        
        _controller = new CryptoController(
            _exchangeService,
            _indicatorFactory,
            _logger,
            _queryDispatcher);
    }

    [Fact]
    public async Task GetPrice_ValidSymbol_ReturnsOkResultWithPrice()
    {
        // Arrange
        var symbol = "BTC";
        var expectedResult = new GetCurrentPriceResult
        {
            Symbol = symbol,
            Price = 50000.00m,
            Timestamp = DateTimeOffset.UtcNow
        };

        _queryDispatcher.Dispatch(Arg.Any<GetCurrentPriceQuery>()).Returns(Task.FromResult(expectedResult));

        // Act
        var actionResult = await _controller.GetPrice(symbol);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var response = Assert.IsType<CryptoPriceResponse>(okResult.Value);
        
        Assert.Equal(symbol, response.Symbol);
        Assert.Equal(expectedResult.Price, response.Price);
        Assert.Equal(expectedResult.Timestamp, response.Timestamp);
        
        // Verify the dispatcher was called with the correct parameters
        await _queryDispatcher.Received(1).Dispatch(Arg.Is<GetCurrentPriceQuery>(q => q.Symbol == symbol));
    }

    [Fact]
    public async Task GetPrice_HandlerThrowsValidationException_ThrowsValidationException()
    {
        // Arrange
        var symbol = "INVALID";
        var expectedException = new ValidationException("Invalid symbol");
        
        _queryDispatcher
            .When(x => x.Dispatch(Arg.Any<GetCurrentPriceQuery>()))
            .Do(x => { throw expectedException; });

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() => _controller.GetPrice(symbol));
        Assert.Same(expectedException, exception);
    }

    [Fact]
    public async Task GetPrice_HandlerThrowsExchangeException_ThrowsExchangeException()
    {
        // Arrange
        var symbol = "BTC";
        var expectedException = new ExchangeException("API error");
        
        _queryDispatcher
            .When(x => x.Dispatch(Arg.Any<GetCurrentPriceQuery>()))
            .Do(x => { throw expectedException; });

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ExchangeException>(() => _controller.GetPrice(symbol));
        Assert.Same(expectedException, exception);
    }
}

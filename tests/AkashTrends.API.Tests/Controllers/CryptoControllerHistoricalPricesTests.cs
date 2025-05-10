using AkashTrends.API.Controllers;
using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.GetHistoricalPrices;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace AkashTrends.API.Tests.Controllers;

public class CryptoControllerHistoricalPricesTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ILogger<CryptoController> _logger;
    private readonly IQueryDispatcher _queryDispatcher;
    private readonly CryptoController _controller;

    public CryptoControllerHistoricalPricesTests()
    {
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
    public async Task GetHistoricalPrices_ValidParameters_ReturnsOkResultWithPrices()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = DateTimeOffset.UtcNow.AddDays(-7);
        var endTime = DateTimeOffset.UtcNow;
        
        var expectedResult = new GetHistoricalPricesResult
        {
            Symbol = symbol,
            StartTime = startTime,
            EndTime = endTime,
            Prices = new List<Application.Features.Crypto.GetHistoricalPrices.PricePoint>
            {
                new() { Price = 50000m, Timestamp = startTime.AddDays(1) },
                new() { Price = 51000m, Timestamp = startTime.AddDays(2) },
                new() { Price = 52000m, Timestamp = startTime.AddDays(3) }
            }
        };

        _queryDispatcher
            .Dispatch(Arg.Is<GetHistoricalPricesQuery>(q => 
                q.Symbol == symbol && 
                q.StartTime == startTime && 
                q.EndTime == endTime))
            .Returns(Task.FromResult(expectedResult));

        // Act
        var actionResult = await _controller.GetHistoricalPrices(symbol, startTime, endTime);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var response = Assert.IsType<HistoricalPricesResponse>(okResult.Value);
        
        Assert.Equal(symbol, response.Symbol);
        Assert.Equal(startTime, response.StartTime);
        Assert.Equal(endTime, response.EndTime);
        Assert.Equal(expectedResult.Prices.Count, response.Prices.Count);
        
        for (int i = 0; i < expectedResult.Prices.Count; i++)
        {
            Assert.Equal(expectedResult.Prices[i].Price, response.Prices[i].Price);
            Assert.Equal(expectedResult.Prices[i].Timestamp, response.Prices[i].Timestamp);
        }
        
        // Verify the dispatcher was called with the correct parameters
        await _queryDispatcher.Received(1).Dispatch(Arg.Is<GetHistoricalPricesQuery>(q => 
            q.Symbol == symbol && 
            q.StartTime == startTime && 
            q.EndTime == endTime));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task GetHistoricalPrices_InvalidSymbol_ThrowsValidationException(string invalidSymbol)
    {
        // Arrange
        var startTime = DateTimeOffset.UtcNow.AddDays(-7);
        var endTime = DateTimeOffset.UtcNow;
        
        var expectedException = new ValidationException("Symbol cannot be empty");
        
        _queryDispatcher
            .When(x => x.Dispatch(Arg.Any<GetHistoricalPricesQuery>()))
            .Do(x => { throw expectedException; });

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() => 
            _controller.GetHistoricalPrices(invalidSymbol, startTime, endTime));
        Assert.Same(expectedException, exception);
    }

    [Fact]
    public async Task GetHistoricalPrices_StartTimeAfterEndTime_ThrowsValidationException()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = DateTimeOffset.UtcNow;
        var endTime = startTime.AddDays(-1); // End time before start time
        
        var expectedException = new ValidationException("Start time must be before end time");
        
        _queryDispatcher
            .When(x => x.Dispatch(Arg.Any<GetHistoricalPricesQuery>()))
            .Do(x => { throw expectedException; });

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationException>(() => 
            _controller.GetHistoricalPrices(symbol, startTime, endTime));
        Assert.Same(expectedException, exception);
    }

    [Fact]
    public async Task GetHistoricalPrices_ExchangeServiceThrowsException_PropagatesException()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = DateTimeOffset.UtcNow.AddDays(-7);
        var endTime = DateTimeOffset.UtcNow;
        
        var expectedException = new ExchangeException("API error");
        
        _queryDispatcher
            .When(x => x.Dispatch(Arg.Any<GetHistoricalPricesQuery>()))
            .Do(x => { throw expectedException; });

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ExchangeException>(() => 
            _controller.GetHistoricalPrices(symbol, startTime, endTime));
        Assert.Same(expectedException, exception);
    }
}

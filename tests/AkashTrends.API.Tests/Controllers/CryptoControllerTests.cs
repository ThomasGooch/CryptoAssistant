using AkashTrends.API.Controllers;
using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.CalculateIndicator;
using AkashTrends.Application.Features.Crypto.GetAvailableIndicators;
using AkashTrends.Application.Features.Crypto.GetCurrentPrice;
using AkashTrends.Application.Features.Crypto.GetHistoricalPrices;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace AkashTrends.API.Tests.Controllers;

public class CryptoControllerTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly CryptoController _controller;
    private readonly ILogger<CryptoController> _logger;
    private readonly IQueryDispatcher _queryDispatcher;

    public CryptoControllerTests()
    {
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _logger = Substitute.For<ILogger<CryptoController>>();
        _queryDispatcher = Substitute.For<IQueryDispatcher>();
        _controller = new CryptoController(_exchangeService, _indicatorFactory, _logger, _queryDispatcher);
    }

    [Fact]
    public async Task Should_ReturnPrice_When_SymbolIsValid()
    {
        // Arrange
        var symbol = "BTC";
        var price = 50000.00m;
        var timestamp = DateTimeOffset.UtcNow;

        var queryResult = new GetCurrentPriceResult
        {
            Symbol = symbol,
            Price = price,
            Timestamp = timestamp
        };

        _queryDispatcher
            .Dispatch(Arg.Any<GetCurrentPriceQuery>())
            .Returns(Task.FromResult(queryResult));

        // Act
        var result = await _controller.GetPrice(symbol);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var priceResponse = okResult.Value.Should().BeOfType<CryptoPriceResponse>().Subject;
        
        priceResponse.Symbol.Should().Be(symbol);
        priceResponse.Price.Should().Be(price);
        priceResponse.Timestamp.Should().Be(timestamp);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("   ")]
    public async Task Should_ThrowValidationException_When_SymbolIsInvalid(string invalidSymbol)
    {
        // Arrange
        _queryDispatcher
            .When(x => x.Dispatch(Arg.Any<GetCurrentPriceQuery>()))
            .Do(x => { throw new ValidationException("Symbol cannot be empty"); });
            
        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _controller.GetPrice(invalidSymbol));
    }

    [Fact]
    public async Task GetIndicator_Should_ReturnIndicatorValue_When_ValidInput()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var startTime = DateTimeOffset.UtcNow.AddDays(-period);
        var endTime = DateTimeOffset.UtcNow;

        var queryResult = new CalculateIndicatorResult
        {
            Symbol = symbol,
            Type = type,
            Value = 51000m,
            StartTime = startTime,
            EndTime = endTime
        };

        _queryDispatcher
            .Dispatch(Arg.Is<CalculateIndicatorQuery>(q =>
                q.Symbol == symbol &&
                q.Type == type &&
                q.Period == period))
            .Returns(Task.FromResult(queryResult));

        // Act
        var result = await _controller.GetIndicator(symbol, type, period);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndicatorResponse>().Subject;

        response.Symbol.Should().Be(symbol);
        response.Type.Should().Be(type);
        response.Value.Should().Be(51000m);
        response.StartTime.Should().Be(startTime);
        response.EndTime.Should().Be(endTime);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task GetIndicator_Should_ReturnBadRequest_When_InvalidSymbol(string symbol)
    {
        // Arrange
        _queryDispatcher
            .When(x => x.Dispatch(Arg.Any<CalculateIndicatorQuery>()))
            .Do(x => { throw new ValidationException("Symbol cannot be empty"); });

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => 
            _controller.GetIndicator(symbol, IndicatorType.SimpleMovingAverage, 14));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetIndicator_Should_ReturnBadRequest_When_InvalidPeriod(int period)
    {
        // Arrange
        _queryDispatcher
            .When(x => x.Dispatch(Arg.Any<CalculateIndicatorQuery>()))
            .Do(x => { throw new ValidationException("Period must be greater than 0"); });

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => 
            _controller.GetIndicator("BTC", IndicatorType.SimpleMovingAverage, period));
    }

    [Fact]
    public async Task Should_ReturnAllIndicators_When_GetAvailableIndicatorsCalled()
    {
        // Arrange
        var indicators = new[]
        {
            IndicatorType.SimpleMovingAverage,
            IndicatorType.ExponentialMovingAverage
        };

        var queryResult = new GetAvailableIndicatorsResult
        {
            Indicators = indicators.ToList()
        };

        _queryDispatcher
            .Dispatch(Arg.Any<GetAvailableIndicatorsQuery>())
            .Returns(Task.FromResult(queryResult));

        // Act
        var result = await _controller.GetAvailableIndicators();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndicatorTypesResponse>().Subject;

        response.Indicators.Should().BeEquivalentTo(indicators);
    }
}

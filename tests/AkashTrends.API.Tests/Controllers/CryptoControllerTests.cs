using AkashTrends.API.Controllers;
using AkashTrends.API.Models;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Xunit;

namespace AkashTrends.API.Tests.Controllers;

public class CryptoControllerTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly CryptoController _controller;

    public CryptoControllerTests()
    {
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _controller = new CryptoController(_exchangeService, _indicatorFactory);
    }

    [Fact]
    public async Task Should_ReturnPrice_When_SymbolIsValid()
    {
        // Arrange
        var symbol = "BTC";
        var price = 50000.00m;
        var timestamp = DateTimeOffset.UtcNow;

        var cryptoPrice = CryptoPrice.Create(
            CryptoCurrency.Create(symbol),
            price,
            timestamp
        );

        _exchangeService.GetCurrentPriceAsync(symbol)
            .Returns(cryptoPrice);

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
    [InlineData(null)]
    public async Task Should_ReturnBadRequest_When_SymbolIsInvalid(string invalidSymbol)
    {
        // Act
        var result = await _controller.GetPrice(invalidSymbol);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Should_ReturnIndicatorValue_When_ParametersAreValid()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.SimpleMovingAverage;
        var period = 14;
        var prices = new List<CryptoPrice>();
        var indicatorValue = 45000.00m;

        _exchangeService.GetHistoricalPricesAsync(symbol, Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>())
            .Returns(prices);

        var indicator = Substitute.For<IIndicator>();
        indicator.Calculate(prices).Returns(new IndicatorResult(indicatorValue, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow));

        _indicatorFactory.CreateIndicator(type, period)
            .Returns(indicator);

        // Act
        var result = await _controller.GetIndicator(symbol, type, period);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndicatorResponse>().Subject;
        
        response.Symbol.Should().Be(symbol);
        response.Type.Should().Be(type);
        response.Value.Should().Be(indicatorValue);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Should_ReturnBadRequest_When_PeriodIsInvalid(int invalidPeriod)
    {
        // Act
        var result = await _controller.GetIndicator("BTC", IndicatorType.SimpleMovingAverage, invalidPeriod);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
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

        _indicatorFactory.GetAvailableIndicators()
            .Returns(indicators);

        // Act
        var result = await _controller.GetAvailableIndicators();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<IndicatorTypesResponse>().Subject;
        
        response.Indicators.Should().BeEquivalentTo(indicators);
    }
}

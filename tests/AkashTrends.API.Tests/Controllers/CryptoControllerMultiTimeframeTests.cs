using AkashTrends.API.Controllers;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.CalculateMultiTimeframeIndicators;
using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Analysis.MultiTimeframe;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;
using FluentAssertions;

namespace AkashTrends.API.Tests.Controllers;

public class CryptoControllerMultiTimeframeTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ILogger<CryptoController> _logger;
    private readonly IQueryDispatcher _queryDispatcher;
    private readonly CryptoController _controller;

    public CryptoControllerMultiTimeframeTests()
    {
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _logger = Substitute.For<ILogger<CryptoController>>();
        _queryDispatcher = Substitute.For<IQueryDispatcher>();
        _controller = new CryptoController(_exchangeService, _indicatorFactory, _logger, _queryDispatcher);
    }

    [Fact]
    public async Task GetMultiTimeframeIndicators_WithValidRequest_ShouldReturnOkResult()
    {
        // Arrange
        var symbol = "BTC-USD";
        var timeframes = "FiveMinutes,Hour,Day";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 20;

        var mockResult = new CalculateMultiTimeframeIndicatorsResult
        {
            Symbol = symbol,
            IndicatorType = indicatorType,
            Period = period,
            IndicatorResults = new Dictionary<Timeframe, IndicatorResult>
            {
                { Timeframe.FiveMinutes, new IndicatorResult(50.0m, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow) },
                { Timeframe.Hour, new IndicatorResult(55.0m, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow) },
                { Timeframe.Day, new IndicatorResult(52.0m, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow) }
            },
            Alignment = new TimeframeAlignment(
                0.8m,
                TrendDirection.Bullish,
                new Dictionary<Timeframe, decimal>
                {
                    { Timeframe.FiveMinutes, 50.0m },
                    { Timeframe.Hour, 55.0m },
                    { Timeframe.Day, 52.0m }
                }
            ),
            StartTime = DateTimeOffset.UtcNow.AddDays(-7),
            EndTime = DateTimeOffset.UtcNow
        };

        _queryDispatcher.Dispatch<CalculateMultiTimeframeIndicatorsQuery, CalculateMultiTimeframeIndicatorsResult>(
            Arg.Any<CalculateMultiTimeframeIndicatorsQuery>())
            .Returns(mockResult);

        // Act
        var result = await _controller.GetMultiTimeframeIndicators(
            symbol, timeframes, indicatorType, period);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<OkObjectResult>();

        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().NotBeNull();

        // Verify query dispatcher was called with correct parameters
        await _queryDispatcher.Received(1).Dispatch<CalculateMultiTimeframeIndicatorsQuery, CalculateMultiTimeframeIndicatorsResult>(
            Arg.Is<CalculateMultiTimeframeIndicatorsQuery>(q =>
                q.Symbol == symbol &&
                q.IndicatorType == indicatorType &&
                q.Period == period &&
                q.Timeframes.Count() == 3
            ));
    }

    [Fact]
    public async Task GetMultiTimeframeIndicators_WithInvalidTimeframes_ShouldReturnBadRequest()
    {
        // Arrange
        var symbol = "BTC-USD";
        var timeframes = "InvalidTimeframe,Hour";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 20;

        // Act
        var result = await _controller.GetMultiTimeframeIndicators(
            symbol, timeframes, indicatorType, period);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();

        var badRequestResult = result.Result as BadRequestObjectResult;
        badRequestResult!.Value.Should().Be("Invalid timeframe: InvalidTimeframe");

        // Verify query dispatcher was never called
        await _queryDispatcher.DidNotReceive().Dispatch<CalculateMultiTimeframeIndicatorsQuery, CalculateMultiTimeframeIndicatorsResult>(
            Arg.Any<CalculateMultiTimeframeIndicatorsQuery>());
    }

    [Fact]
    public async Task GetMultiTimeframeIndicators_WithEmptyTimeframes_ShouldReturnBadRequest()
    {
        // Arrange
        var symbol = "BTC-USD";
        var timeframes = "";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 20;

        // Act
        var result = await _controller.GetMultiTimeframeIndicators(
            symbol, timeframes, indicatorType, period);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();

        var badRequestResult = result.Result as BadRequestObjectResult;
        badRequestResult!.Value.Should().Be("At least one valid timeframe must be specified");
    }

    [Fact]
    public async Task GetMultiTimeframeIndicators_WithSingleTimeframe_ShouldReturnOkResult()
    {
        // Arrange
        var symbol = "BTC-USD";
        var timeframes = "Hour";
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 20;

        var mockResult = new CalculateMultiTimeframeIndicatorsResult
        {
            Symbol = symbol,
            IndicatorType = indicatorType,
            Period = period,
            IndicatorResults = new Dictionary<Timeframe, IndicatorResult>
            {
                { Timeframe.Hour, new IndicatorResult(55.0m, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow) }
            },
            Alignment = new TimeframeAlignment(
                1.0m, // Perfect alignment with single timeframe
                TrendDirection.Neutral,
                new Dictionary<Timeframe, decimal>
                {
                    { Timeframe.Hour, 55.0m }
                }
            ),
            StartTime = DateTimeOffset.UtcNow.AddDays(-7),
            EndTime = DateTimeOffset.UtcNow
        };

        _queryDispatcher.Dispatch<CalculateMultiTimeframeIndicatorsQuery, CalculateMultiTimeframeIndicatorsResult>(
            Arg.Any<CalculateMultiTimeframeIndicatorsQuery>())
            .Returns(mockResult);

        // Act
        var result = await _controller.GetMultiTimeframeIndicators(
            symbol, timeframes, indicatorType, period);

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<OkObjectResult>();

        // Verify query dispatcher was called with single timeframe
        await _queryDispatcher.Received(1).Dispatch<CalculateMultiTimeframeIndicatorsQuery, CalculateMultiTimeframeIndicatorsResult>(
            Arg.Is<CalculateMultiTimeframeIndicatorsQuery>(q =>
                q.Symbol == symbol &&
                q.Timeframes.Count() == 1 &&
                q.Timeframes.First() == Timeframe.Hour
            ));
    }
}
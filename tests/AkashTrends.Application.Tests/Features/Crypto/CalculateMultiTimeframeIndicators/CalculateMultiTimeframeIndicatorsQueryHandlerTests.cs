using AkashTrends.Application.Features.Crypto.CalculateMultiTimeframeIndicators;
using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Analysis.MultiTimeframe;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace AkashTrends.Application.Tests.Features.Crypto.CalculateMultiTimeframeIndicators;

public class CalculateMultiTimeframeIndicatorsQueryHandlerTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IMultiTimeframeIndicatorService _multiTimeframeService;
    private readonly ILogger<CalculateMultiTimeframeIndicatorsQueryHandler> _logger;
    private readonly CalculateMultiTimeframeIndicatorsQueryHandler _handler;

    public CalculateMultiTimeframeIndicatorsQueryHandlerTests()
    {
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _multiTimeframeService = Substitute.For<IMultiTimeframeIndicatorService>();
        _logger = Substitute.For<ILogger<CalculateMultiTimeframeIndicatorsQueryHandler>>();
        _handler = new CalculateMultiTimeframeIndicatorsQueryHandler(
            _exchangeService, _multiTimeframeService, _logger);
    }

    [Fact]
    public async Task Handle_WithValidQuery_ShouldReturnMultiTimeframeResults()
    {
        // Arrange
        var query = new CalculateMultiTimeframeIndicatorsQuery
        {
            Symbol = "BTC-USD",
            Timeframes = new[] { Timeframe.FiveMinutes, Timeframe.Hour },
            IndicatorType = IndicatorType.SimpleMovingAverage,
            Period = 20,
            StartTime = DateTimeOffset.UtcNow.AddDays(-7),
            EndTime = DateTimeOffset.UtcNow
        };

        var candlestickData = CreateSampleCandlestickData();
        _exchangeService.GetHistoricalCandlestickDataAsync(query.Symbol, 
            Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>())
            .Returns(candlestickData);

        var indicatorResults = new Dictionary<Timeframe, IndicatorResult>
        {
            { Timeframe.FiveMinutes, new IndicatorResult(50.0m, DateTimeOffset.UtcNow.AddHours(-1), DateTimeOffset.UtcNow) },
            { Timeframe.Hour, new IndicatorResult(55.0m, DateTimeOffset.UtcNow.AddHours(-2), DateTimeOffset.UtcNow) }
        };

        var alignment = new TimeframeAlignment(
            0.8m, 
            TrendDirection.Bullish, 
            new Dictionary<Timeframe, decimal> 
            { 
                { Timeframe.FiveMinutes, 50.0m }, 
                { Timeframe.Hour, 55.0m } 
            });

        _multiTimeframeService.CalculateMultiTimeframeIndicators(
            query.Symbol, candlestickData, query.Timeframes, query.IndicatorType, query.Period)
            .Returns(indicatorResults);

        _multiTimeframeService.GetTimeframeAlignment(indicatorResults)
            .Returns(alignment);

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotBeNull();
        result.Symbol.Should().Be(query.Symbol);
        result.IndicatorType.Should().Be(query.IndicatorType);
        result.Period.Should().Be(query.Period);
        result.IndicatorResults.Should().HaveCount(2);
        result.Alignment.Should().Be(alignment);

        _exchangeService.Received(1).GetHistoricalCandlestickDataAsync(
            query.Symbol, Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>());
        _multiTimeframeService.Received(1).CalculateMultiTimeframeIndicators(
            query.Symbol, candlestickData, query.Timeframes, query.IndicatorType, query.Period);
        _multiTimeframeService.Received(1).GetTimeframeAlignment(indicatorResults);
    }

    [Fact]
    public async Task Handle_WithNoStartEndTime_ShouldUseDefaultTimeRange()
    {
        // Arrange
        var query = new CalculateMultiTimeframeIndicatorsQuery
        {
            Symbol = "BTC-USD",
            Timeframes = new[] { Timeframe.FiveMinutes },
            IndicatorType = IndicatorType.SimpleMovingAverage,
            Period = 20
            // No StartTime/EndTime specified
        };

        var candlestickData = CreateSampleCandlestickData();
        _exchangeService.GetHistoricalCandlestickDataAsync(Arg.Any<string>(), 
            Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>())
            .Returns(candlestickData);

        var indicatorResults = new Dictionary<Timeframe, IndicatorResult>();
        var alignment = new TimeframeAlignment(0m, TrendDirection.Neutral, new Dictionary<Timeframe, decimal>());

        _multiTimeframeService.CalculateMultiTimeframeIndicators(
            Arg.Any<string>(), Arg.Any<IEnumerable<CandlestickData>>(), Arg.Any<IEnumerable<Timeframe>>(), 
            Arg.Any<IndicatorType>(), Arg.Any<int>())
            .Returns(indicatorResults);

        _multiTimeframeService.GetTimeframeAlignment(Arg.Any<Dictionary<Timeframe, IndicatorResult>>())
            .Returns(alignment);

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotBeNull();
        result.StartTime.Should().BeCloseTo(DateTimeOffset.UtcNow.AddDays(-30), TimeSpan.FromMinutes(5));
        result.EndTime.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task Handle_WithEmptyData_ShouldThrowException()
    {
        // Arrange
        var query = new CalculateMultiTimeframeIndicatorsQuery
        {
            Symbol = "BTC-USD",
            Timeframes = new[] { Timeframe.FiveMinutes },
            IndicatorType = IndicatorType.SimpleMovingAverage,
            Period = 20
        };

        _exchangeService.GetHistoricalCandlestickDataAsync(Arg.Any<string>(), 
            Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>())
            .Returns(new List<CandlestickData>()); // Empty data

        // Act & Assert
        await _handler.Invoking(h => h.Handle(query))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*No candlestick data available*");
    }

    private List<CandlestickData> CreateSampleCandlestickData()
    {
        var data = new List<CandlestickData>();
        var baseTime = DateTimeOffset.UtcNow.AddDays(-1);

        for (int i = 0; i < 50; i++)
        {
            var timestamp = baseTime.AddMinutes(i);
            var price = 100 + i * 0.5m;

            data.Add(CandlestickData.Create(
                timestamp: timestamp,
                open: price,
                high: price + 2,
                low: price - 1,
                close: price + 1,
                volume: 1000 + i * 10
            ));
        }

        return data;
    }
}
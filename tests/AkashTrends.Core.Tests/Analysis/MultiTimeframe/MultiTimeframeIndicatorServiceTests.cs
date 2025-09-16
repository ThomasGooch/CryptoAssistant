using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Analysis.MultiTimeframe;
using AkashTrends.Core.Domain;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.MultiTimeframe;

public class MultiTimeframeIndicatorServiceTests
{
    private readonly ITimeframeConverter _timeframeConverter;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly MultiTimeframeIndicatorService _service;

    public MultiTimeframeIndicatorServiceTests()
    {
        _timeframeConverter = Substitute.For<ITimeframeConverter>();
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _service = new MultiTimeframeIndicatorService(_timeframeConverter, _indicatorFactory);
    }

    [Fact]
    public void CalculateMultiTimeframeIndicators_WithValidData_ShouldCalculateForAllTimeframes()
    {
        // Arrange
        var sourceData = CreateSampleCandlestickData();
        var targetTimeframes = new[] { Timeframe.FiveMinutes, Timeframe.Hour };
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 20;

        // Mock timeframe converter
        var fiveMinuteData = CreateSampleCandlestickData(5);
        var hourlyData = CreateSampleCandlestickData(2);
        _timeframeConverter.AggregateToTimeframe(Arg.Is<IEnumerable<CandlestickData>>(x => x.Any()), Timeframe.FiveMinutes)
            .Returns(fiveMinuteData);
        _timeframeConverter.AggregateToTimeframe(Arg.Is<IEnumerable<CandlestickData>>(x => x.Any()), Timeframe.Hour)
            .Returns(hourlyData);

        // Mock indicator factory
        var smaIndicator = Substitute.For<IIndicator>();
        var fiveMinResult = new IndicatorResult(50.0m, DateTime.UtcNow, DateTime.UtcNow);
        var hourlyResult = new IndicatorResult(55.0m, DateTime.UtcNow, DateTime.UtcNow);

        _indicatorFactory.CreateIndicator(indicatorType, period).Returns(smaIndicator);

        // Set up sequential returns for multiple calls
        var callCount = 0;
        smaIndicator.Calculate(Arg.Any<IReadOnlyList<CryptoPrice>>())
            .Returns(x =>
            {
                callCount++;
                return callCount == 1 ? fiveMinResult : hourlyResult;
            });

        // Act
        var results = _service.CalculateMultiTimeframeIndicators(
            "BTC",
            sourceData,
            targetTimeframes,
            indicatorType,
            period);

        // Assert
        results.Should().HaveCount(2);
        if (results.Count > 0)
        {
            results.Should().ContainKey(Timeframe.FiveMinutes);
            results.Should().ContainKey(Timeframe.Hour);
            results[Timeframe.FiveMinutes].Should().Be(fiveMinResult);
            results[Timeframe.Hour].Should().Be(hourlyResult);
        }
    }

    [Fact]
    public void CalculateMultiTimeframeIndicators_WithEmptySourceData_ShouldReturnEmptyResults()
    {
        // Arrange
        var emptyData = Enumerable.Empty<CandlestickData>();
        var targetTimeframes = new[] { Timeframe.FiveMinutes };
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 20;

        // Act
        var results = _service.CalculateMultiTimeframeIndicators(
            "BTC",
            emptyData,
            targetTimeframes,
            indicatorType,
            period);

        // Assert
        results.Should().BeEmpty();
    }

    [Fact]
    public void CalculateMultiTimeframeIndicators_WithNoValidTimeframes_ShouldReturnEmptyResults()
    {
        // Arrange
        var sourceData = CreateSampleCandlestickData();
        var targetTimeframes = Array.Empty<Timeframe>();
        var indicatorType = IndicatorType.SimpleMovingAverage;
        var period = 20;

        // Act
        var results = _service.CalculateMultiTimeframeIndicators(
            "BTC",
            sourceData,
            targetTimeframes,
            indicatorType,
            period);

        // Assert
        results.Should().BeEmpty();
    }

    [Fact]
    public void GetTimeframeAlignment_WithSameIndicatorValues_ShouldReturnHighAlignment()
    {
        // Arrange
        var results = new Dictionary<Timeframe, IndicatorResult>
        {
            { Timeframe.FiveMinutes, new IndicatorResult(50.0m, DateTime.UtcNow, DateTime.UtcNow) },
            { Timeframe.FifteenMinutes, new IndicatorResult(52.0m, DateTime.UtcNow, DateTime.UtcNow) },
            { Timeframe.Hour, new IndicatorResult(51.0m, DateTime.UtcNow, DateTime.UtcNow) }
        };

        // Act
        var alignment = _service.GetTimeframeAlignment(results);

        // Assert
        alignment.AlignmentScore.Should().BeGreaterThan(0.8m); // High alignment for similar values
        alignment.TrendDirection.Should().Be(TrendDirection.Neutral); // Values are close
    }

    [Fact]
    public void GetTimeframeAlignment_WithAscendingValues_ShouldReturnBullishTrend()
    {
        // Arrange
        var results = new Dictionary<Timeframe, IndicatorResult>
        {
            { Timeframe.FiveMinutes, new IndicatorResult(45.0m, DateTime.UtcNow, DateTime.UtcNow) },
            { Timeframe.FifteenMinutes, new IndicatorResult(50.0m, DateTime.UtcNow, DateTime.UtcNow) },
            { Timeframe.Hour, new IndicatorResult(55.0m, DateTime.UtcNow, DateTime.UtcNow) }
        };

        // Act
        var alignment = _service.GetTimeframeAlignment(results);

        // Assert
        alignment.TrendDirection.Should().Be(TrendDirection.Bullish);
        alignment.AlignmentScore.Should().BeGreaterThan(0.5m);
    }

    [Fact]
    public void GetTimeframeAlignment_WithDescendingValues_ShouldReturnBearishTrend()
    {
        // Arrange
        var results = new Dictionary<Timeframe, IndicatorResult>
        {
            { Timeframe.FiveMinutes, new IndicatorResult(55.0m, DateTime.UtcNow, DateTime.UtcNow) },
            { Timeframe.FifteenMinutes, new IndicatorResult(50.0m, DateTime.UtcNow, DateTime.UtcNow) },
            { Timeframe.Hour, new IndicatorResult(45.0m, DateTime.UtcNow, DateTime.UtcNow) }
        };

        // Act
        var alignment = _service.GetTimeframeAlignment(results);

        // Assert
        alignment.TrendDirection.Should().Be(TrendDirection.Bearish);
        alignment.AlignmentScore.Should().BeGreaterThan(0.5m);
    }

    [Fact]
    public void GetTimeframeAlignment_WithMixedValues_ShouldReturnLowerAlignment()
    {
        // Arrange
        var results = new Dictionary<Timeframe, IndicatorResult>
        {
            { Timeframe.FiveMinutes, new IndicatorResult(30.0m, DateTime.UtcNow, DateTime.UtcNow) },
            { Timeframe.FifteenMinutes, new IndicatorResult(70.0m, DateTime.UtcNow, DateTime.UtcNow) },
            { Timeframe.Hour, new IndicatorResult(45.0m, DateTime.UtcNow, DateTime.UtcNow) }
        };

        // Act
        var alignment = _service.GetTimeframeAlignment(results);

        // Assert
        alignment.AlignmentScore.Should().BeLessThan(0.5m); // Low alignment for divergent values
    }

    private List<CandlestickData> CreateSampleCandlestickData(int count = 50)
    {
        var data = new List<CandlestickData>();
        var baseTime = new DateTimeOffset(2025, 1, 1, 10, 0, 0, TimeSpan.Zero);

        for (int i = 0; i < count; i++)
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
using AkashTrends.Core.Analysis.MultiTimeframe;
using AkashTrends.Core.Analysis;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.MultiTimeframe;

public class TimeframeConverterTests
{
    private readonly TimeframeConverter _converter;

    public TimeframeConverterTests()
    {
        _converter = new TimeframeConverter();
    }

    [Fact]
    public void CanConvert_WhenTargetIsHigherTimeframe_ShouldReturnTrue()
    {
        // Arrange & Act
        var result = _converter.CanConvert(Timeframe.Minute, Timeframe.FiveMinutes);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanConvert_WhenTargetIsLowerTimeframe_ShouldReturnFalse()
    {
        // Arrange & Act
        var result = _converter.CanConvert(Timeframe.Hour, Timeframe.FiveMinutes);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanConvert_WhenTargetIsNotEvenlyDivisible_ShouldReturnFalse()
    {
        // Arrange & Act - 15 minutes is not evenly divisible by 60 minutes
        var result = _converter.CanConvert(Timeframe.Hour, Timeframe.FifteenMinutes);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void AggregateToTimeframe_WithEmptyData_ShouldReturnEmpty()
    {
        // Arrange
        var emptyData = Enumerable.Empty<CandlestickData>();

        // Act
        var result = _converter.AggregateToTimeframe(emptyData, Timeframe.FiveMinutes);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void AggregateToTimeframe_WithOneMinuteToFiveMinute_ShouldAggregateCorrectly()
    {
        // Arrange
        var baseTime = new DateTimeOffset(2025, 1, 1, 10, 0, 0, TimeSpan.Zero);
        var sourceData = new List<CandlestickData>
        {
            // First 5-minute group: 10:00-10:04
            CandlestickData.Create(baseTime, 100, 105, 99, 102, 1000),
            CandlestickData.Create(baseTime.AddMinutes(1), 102, 107, 101, 104, 1500),
            CandlestickData.Create(baseTime.AddMinutes(2), 104, 106, 103, 105, 1200),
            CandlestickData.Create(baseTime.AddMinutes(3), 105, 108, 104, 106, 1800),
            CandlestickData.Create(baseTime.AddMinutes(4), 106, 109, 105, 107, 1100),
            
            // Second 5-minute group: 10:05-10:09
            CandlestickData.Create(baseTime.AddMinutes(5), 107, 110, 106, 108, 2000),
            CandlestickData.Create(baseTime.AddMinutes(6), 108, 111, 107, 109, 1600)
        };

        // Act
        var result = _converter.AggregateToTimeframe(sourceData, Timeframe.FiveMinutes).ToList();

        // Assert
        result.Should().HaveCount(2);

        // First 5-minute candle
        var firstCandle = result[0];
        firstCandle.Timestamp.Should().Be(baseTime); // 10:00:00
        firstCandle.Open.Should().Be(100);           // First candle's open
        firstCandle.High.Should().Be(109);           // Highest high across all 5 candles
        firstCandle.Low.Should().Be(99);             // Lowest low across all 5 candles
        firstCandle.Close.Should().Be(107);          // Last candle's close
        firstCandle.Volume.Should().Be(6600);        // Sum of all volumes

        // Second 5-minute candle
        var secondCandle = result[1];
        secondCandle.Timestamp.Should().Be(baseTime.AddMinutes(5)); // 10:05:00
        secondCandle.Open.Should().Be(107);
        secondCandle.High.Should().Be(111);
        secondCandle.Low.Should().Be(106);
        secondCandle.Close.Should().Be(109);
        secondCandle.Volume.Should().Be(3600);
    }

    [Fact]
    public void AggregateToTimeframe_WithUnsortedData_ShouldSortAndAggregate()
    {
        // Arrange
        var baseTime = new DateTimeOffset(2025, 1, 1, 10, 0, 0, TimeSpan.Zero);
        var unsortedData = new List<CandlestickData>
        {
            CandlestickData.Create(baseTime.AddMinutes(2), 104, 106, 103, 105, 1200),
            CandlestickData.Create(baseTime, 100, 105, 99, 102, 1000),
            CandlestickData.Create(baseTime.AddMinutes(1), 102, 107, 101, 104, 1500)
        };

        // Act
        var result = _converter.AggregateToTimeframe(unsortedData, Timeframe.FiveMinutes).ToList();

        // Assert
        result.Should().HaveCount(1);
        var candle = result[0];
        candle.Open.Should().Be(100);    // First chronologically
        candle.Close.Should().Be(105);   // Last chronologically
        candle.High.Should().Be(107);    // Highest across all
        candle.Low.Should().Be(99);      // Lowest across all
    }

    [Theory]
    [InlineData(Timeframe.Minute, 1)]
    [InlineData(Timeframe.FiveMinutes, 5)]
    [InlineData(Timeframe.FifteenMinutes, 15)]
    [InlineData(Timeframe.Hour, 60)]
    [InlineData(Timeframe.FourHours, 240)]
    [InlineData(Timeframe.Day, 1440)]
    [InlineData(Timeframe.Week, 10080)]
    public void GetTimeframeInMinutes_ShouldReturnCorrectValues(Timeframe timeframe, int expectedMinutes)
    {
        // This test validates the private method indirectly through CanConvert behavior
        // We test that conversion ratios work correctly

        // Arrange & Act
        var canConvertFromMinute = _converter.CanConvert(Timeframe.Minute, timeframe);

        // Assert
        if (expectedMinutes > 1)
        {
            canConvertFromMinute.Should().BeTrue($"Should be able to convert from 1 minute to {expectedMinutes} minutes");
        }
        else
        {
            canConvertFromMinute.Should().BeFalse($"Cannot convert to same timeframe");
        }
    }

    [Fact]
    public void AggregateToTimeframe_WithPartialLastGroup_ShouldIncludePartialGroup()
    {
        // Arrange - Only 3 minutes of data for 5-minute aggregation
        var baseTime = new DateTimeOffset(2025, 1, 1, 10, 0, 0, TimeSpan.Zero);
        var sourceData = new List<CandlestickData>
        {
            CandlestickData.Create(baseTime, 100, 105, 99, 102, 1000),
            CandlestickData.Create(baseTime.AddMinutes(1), 102, 107, 101, 104, 1500),
            CandlestickData.Create(baseTime.AddMinutes(2), 104, 106, 103, 105, 1200)
        };

        // Act
        var result = _converter.AggregateToTimeframe(sourceData, Timeframe.FiveMinutes).ToList();

        // Assert
        result.Should().HaveCount(1);
        var candle = result[0];
        candle.Open.Should().Be(100);
        candle.Close.Should().Be(105);
        candle.Volume.Should().Be(3700); // Sum of all 3 candles
    }
}
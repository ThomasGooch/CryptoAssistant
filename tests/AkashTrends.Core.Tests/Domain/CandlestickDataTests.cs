using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Domain;

public class CandlestickDataTests
{
    [Fact]
    public void Create_WithValidOHLCData_ShouldCreateCandlestick()
    {
        // Arrange
        var timestamp = DateTimeOffset.UtcNow;
        var open = 50000m;
        var high = 52000m;
        var low = 49000m;
        var close = 51000m;
        var volume = 1000m;

        // Act
        var candlestick = CandlestickData.Create(timestamp, open, high, low, close, volume);

        // Assert
        candlestick.Timestamp.Should().Be(timestamp);
        candlestick.Open.Should().Be(open);
        candlestick.High.Should().Be(high);
        candlestick.Low.Should().Be(low);
        candlestick.Close.Should().Be(close);
        candlestick.Volume.Should().Be(volume);
    }

    [Fact]
    public void Create_WithHighLowerThanLow_ShouldThrowException()
    {
        // Arrange
        var timestamp = DateTimeOffset.UtcNow;
        var open = 50000m;
        var high = 48000m; // High is lower than low - invalid
        var low = 49000m;
        var close = 51000m;
        var volume = 1000m;

        // Act & Assert
        var act = () => CandlestickData.Create(timestamp, open, high, low, close, volume);
        act.Should().Throw<ArgumentException>()
            .WithMessage("High price must be greater than or equal to low price*");
    }

    [Fact]
    public void Create_WithOpenHigherThanHigh_ShouldThrowException()
    {
        // Arrange
        var timestamp = DateTimeOffset.UtcNow;
        var open = 53000m; // Open is higher than high - invalid
        var high = 52000m;
        var low = 49000m;
        var close = 51000m;
        var volume = 1000m;

        // Act & Assert
        var act = () => CandlestickData.Create(timestamp, open, high, low, close, volume);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Open price must be within high-low range*");
    }

    [Fact]
    public void Create_WithOpenLowerThanLow_ShouldThrowException()
    {
        // Arrange
        var timestamp = DateTimeOffset.UtcNow;
        var open = 48000m; // Open is lower than low - invalid
        var high = 52000m;
        var low = 49000m;
        var close = 51000m;
        var volume = 1000m;

        // Act & Assert
        var act = () => CandlestickData.Create(timestamp, open, high, low, close, volume);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Open price must be within high-low range*");
    }

    [Fact]
    public void Create_WithCloseHigherThanHigh_ShouldThrowException()
    {
        // Arrange
        var timestamp = DateTimeOffset.UtcNow;
        var open = 50000m;
        var high = 52000m;
        var low = 49000m;
        var close = 53000m; // Close is higher than high - invalid
        var volume = 1000m;

        // Act & Assert
        var act = () => CandlestickData.Create(timestamp, open, high, low, close, volume);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Close price must be within high-low range*");
    }

    [Fact]
    public void Create_WithCloseLowerThanLow_ShouldThrowException()
    {
        // Arrange
        var timestamp = DateTimeOffset.UtcNow;
        var open = 50000m;
        var high = 52000m;
        var low = 49000m;
        var close = 48000m; // Close is lower than low - invalid
        var volume = 1000m;

        // Act & Assert
        var act = () => CandlestickData.Create(timestamp, open, high, low, close, volume);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Close price must be within high-low range*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public void Create_WithInvalidVolume_ShouldThrowException(decimal volume)
    {
        // Arrange
        var timestamp = DateTimeOffset.UtcNow;
        var open = 50000m;
        var high = 52000m;
        var low = 49000m;
        var close = 51000m;

        // Act & Assert
        var act = () => CandlestickData.Create(timestamp, open, high, low, close, volume);
        act.Should().Throw<ArgumentException>()
            .WithMessage("Volume must be greater than zero*");
    }

    [Fact]
    public void IsBullish_WhenCloseHigherThanOpen_ShouldReturnTrue()
    {
        // Arrange
        var candlestick = CandlestickData.Create(
            DateTimeOffset.UtcNow, 50000m, 52000m, 49000m, 51000m, 1000m);

        // Act & Assert
        candlestick.IsBullish.Should().BeTrue();
    }

    [Fact]
    public void IsBullish_WhenCloseLowerThanOpen_ShouldReturnFalse()
    {
        // Arrange
        var candlestick = CandlestickData.Create(
            DateTimeOffset.UtcNow, 51000m, 52000m, 49000m, 50000m, 1000m);

        // Act & Assert
        candlestick.IsBullish.Should().BeFalse();
    }

    [Fact]
    public void IsDoji_WhenOpenEqualsClose_ShouldReturnTrue()
    {
        // Arrange
        var candlestick = CandlestickData.Create(
            DateTimeOffset.UtcNow, 50000m, 52000m, 49000m, 50000m, 1000m);

        // Act & Assert
        candlestick.IsDoji.Should().BeTrue();
    }

    [Fact]
    public void BodySize_ShouldReturnAbsoluteDifferenceBetweenOpenAndClose()
    {
        // Arrange
        var candlestick = CandlestickData.Create(
            DateTimeOffset.UtcNow, 50000m, 52000m, 49000m, 51500m, 1000m);

        // Act & Assert
        candlestick.BodySize.Should().Be(1500m);
    }

    [Fact]
    public void UpperShadow_ShouldReturnCorrectLength()
    {
        // Arrange
        var candlestick = CandlestickData.Create(
            DateTimeOffset.UtcNow, 50000m, 52000m, 49000m, 51000m, 1000m);

        // Act & Assert
        candlestick.UpperShadow.Should().Be(1000m); // High (52000) - Max(Open, Close) (51000)
    }

    [Fact]
    public void LowerShadow_ShouldReturnCorrectLength()
    {
        // Arrange
        var candlestick = CandlestickData.Create(
            DateTimeOffset.UtcNow, 50000m, 52000m, 49000m, 51000m, 1000m);

        // Act & Assert
        candlestick.LowerShadow.Should().Be(1000m); // Min(Open, Close) (50000) - Low (49000)
    }

    [Fact]
    public void TotalRange_ShouldReturnHighMinusLow()
    {
        // Arrange
        var candlestick = CandlestickData.Create(
            DateTimeOffset.UtcNow, 50000m, 52000m, 49000m, 51000m, 1000m);

        // Act & Assert
        candlestick.TotalRange.Should().Be(3000m); // High (52000) - Low (49000)
    }
}
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.Indicators;

public class RelativeStrengthIndexTests
{
    private readonly CryptoCurrency _btc;
    private readonly DateTimeOffset _baseTime;

    public RelativeStrengthIndexTests()
    {
        _btc = CryptoCurrency.Create("BTC");
        _baseTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public void Calculate_WithValidPrices_ShouldReturnCorrectRSI()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(45000m, 0),  // Base
            CreatePrice(46000m, 1),  // Up 1000
            CreatePrice(45500m, 2),  // Down 500
            CreatePrice(46500m, 3),  // Up 1000
            CreatePrice(46200m, 4),  // Down 300
            CreatePrice(46800m, 5),  // Up 600
        };

        var rsi = new RelativeStrengthIndex(period: 5);

        // Act
        var result = rsi.Calculate(prices);

        // Assert
        // Average Gain = (1000 + 1000 + 600) / 5 = 520
        // Average Loss = (500 + 300) / 5 = 160
        // RS = 520/160 = 3.25
        // RSI = 100 - (100 / (1 + 3.25)) = 76.47
        result.Value.Should().BeApproximately(76.47m, 0.01m);
        result.StartTime.Should().Be(prices[0].Timestamp);
        result.EndTime.Should().Be(prices[5].Timestamp);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_WithInvalidPeriod_ShouldThrowArgumentException(int invalidPeriod)
    {
        // Act
        var act = () => new RelativeStrengthIndex(invalidPeriod);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Period must be greater than 0*");
    }

    [Fact]
    public void Calculate_WithInsufficientData_ShouldThrowArgumentException()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(100m, 0),
            CreatePrice(200m, 1)
        };

        var rsi = new RelativeStrengthIndex(period: 3);

        // Act
        var act = () => rsi.Calculate(prices);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Insufficient data points. Need at least 3 prices, but got 2*");
    }

    [Fact]
    public void Calculate_WithUnsortedPrices_ShouldThrowArgumentException()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(100m, 2),
            CreatePrice(200m, 1),
            CreatePrice(300m, 0)
        };

        var rsi = new RelativeStrengthIndex(period: 3);

        // Act
        var act = () => rsi.Calculate(prices);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Prices must be sorted by timestamp in ascending order*");
    }

    [Fact]
    public void Calculate_WithAllGains_ShouldReturn100()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(100m, 0),
            CreatePrice(200m, 1),
            CreatePrice(300m, 2),
            CreatePrice(400m, 3)
        };

        var rsi = new RelativeStrengthIndex(period: 3);

        // Act
        var result = rsi.Calculate(prices);

        // Assert
        result.Value.Should().Be(100m);
    }

    [Fact]
    public void Calculate_WithAllLosses_ShouldReturn0()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(400m, 0),
            CreatePrice(300m, 1),
            CreatePrice(200m, 2),
            CreatePrice(100m, 3)
        };

        var rsi = new RelativeStrengthIndex(period: 3);

        // Act
        var result = rsi.Calculate(prices);

        // Assert
        result.Value.Should().Be(0m);
    }

    [Fact]
    public void Calculate_WithNoPriceChange_ShouldReturn50()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(100m, 0),
            CreatePrice(100m, 1),
            CreatePrice(100m, 2),
            CreatePrice(100m, 3)
        };

        var rsi = new RelativeStrengthIndex(period: 3);

        // Act
        var result = rsi.Calculate(prices);

        // Assert
        result.Value.Should().Be(50m);
    }

    private CryptoPrice CreatePrice(decimal value, int minutesOffset) =>
        CryptoPrice.Create(_btc, value, _baseTime.AddMinutes(minutesOffset));
}

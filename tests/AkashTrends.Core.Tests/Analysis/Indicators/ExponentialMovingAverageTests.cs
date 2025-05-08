using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.Indicators;

public class ExponentialMovingAverageTests
{
    private readonly CryptoCurrency _btc;
    private readonly DateTimeOffset _baseTime;

    public ExponentialMovingAverageTests()
    {
        _btc = CryptoCurrency.Create("BTC");
        _baseTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public void Calculate_WithValidPrices_ShouldReturnCorrectEMA()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(100m, 0),
            CreatePrice(200m, 1),
            CreatePrice(150m, 2),
            CreatePrice(180m, 3)
        };

        var ema = new ExponentialMovingAverage(period: 3);

        // Act
        var result = ema.Calculate(prices);

        // Assert
        // First value is SMA of first 3 prices: (100 + 200 + 150) / 3 = 150
        // Multiplier = 2 / (3 + 1) = 0.5
        // EMA = Price * multiplier + EMA(previous) * (1 - multiplier)
        // EMA = 180 * 0.5 + 150 * 0.5 = 165
        result.Value.Should().BeApproximately(165m, 0.01m);
        result.StartTime.Should().Be(prices[0].Timestamp);
        result.EndTime.Should().Be(prices[3].Timestamp);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_WithInvalidPeriod_ShouldThrowArgumentException(int invalidPeriod)
    {
        // Act
        var act = () => new ExponentialMovingAverage(invalidPeriod);

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

        var ema = new ExponentialMovingAverage(period: 3);

        // Act
        var act = () => ema.Calculate(prices);

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

        var ema = new ExponentialMovingAverage(period: 3);

        // Act
        var act = () => ema.Calculate(prices);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Prices must be sorted by timestamp in ascending order*");
    }

    [Fact]
    public void Calculate_WithSinglePrice_ShouldReturnSameValue()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(100m, 0)
        };

        var ema = new ExponentialMovingAverage(period: 1);

        // Act
        var result = ema.Calculate(prices);

        // Assert
        result.Value.Should().Be(100m);
    }

    private CryptoPrice CreatePrice(decimal value, int minutesOffset) =>
        CryptoPrice.Create(_btc, value, _baseTime.AddMinutes(minutesOffset));
}

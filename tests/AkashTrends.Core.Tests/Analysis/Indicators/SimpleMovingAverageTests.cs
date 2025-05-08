using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.Indicators;

public class SimpleMovingAverageTests
{
    private readonly CryptoCurrency _btc;
    private readonly DateTimeOffset _baseTime;

    public SimpleMovingAverageTests()
    {
        _btc = CryptoCurrency.Create("BTC");
        _baseTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public void Calculate_WithValidPrices_ShouldReturnCorrectAverage()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(100m, 0),
            CreatePrice(200m, 1),
            CreatePrice(300m, 2)
        };

        var sma = new SimpleMovingAverage(period: 3);

        // Act
        var result = sma.Calculate(prices);

        // Assert
        result.Value.Should().Be(200m);
        result.StartTime.Should().Be(prices[0].Timestamp);
        result.EndTime.Should().Be(prices[2].Timestamp);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_WithInvalidPeriod_ShouldThrowArgumentException(int invalidPeriod)
    {
        // Act
        var act = () => new SimpleMovingAverage(invalidPeriod);

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

        var sma = new SimpleMovingAverage(period: 3);

        // Act
        var act = () => sma.Calculate(prices);

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
            CreatePrice(100m, 2), // Out of order
            CreatePrice(200m, 1),
            CreatePrice(300m, 0)
        };

        var sma = new SimpleMovingAverage(period: 3);

        // Act
        var act = () => sma.Calculate(prices);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Prices must be sorted by timestamp in ascending order*");
    }

    [Fact]
    public void Calculate_WithDifferentCurrencies_ShouldThrowArgumentException()
    {
        // Arrange
        var eth = CryptoCurrency.Create("ETH");
        var prices = new[]
        {
            CreatePrice(100m, 0),
            CreatePrice(200m, 1),
            CryptoPrice.Create(eth, 300m, _baseTime.AddMinutes(2)) // Different currency
        };

        var sma = new SimpleMovingAverage(period: 3);

        // Act
        var act = () => sma.Calculate(prices);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("All prices must be for the same currency*");
    }

    private CryptoPrice CreatePrice(decimal value, int minutesOffset) =>
        CryptoPrice.Create(_btc, value, _baseTime.AddMinutes(minutesOffset));
}

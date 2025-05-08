using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.Indicators;

public class StochasticOscillatorTests
{
    private readonly CryptoCurrency _btc;
    private readonly DateTimeOffset _baseTime;

    public StochasticOscillatorTests()
    {
        _btc = CryptoCurrency.Create("BTC");
        _baseTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public void Calculate_WithValidPrices_ShouldReturnCorrectStochastic()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(30000m, 0), // Low
            CreatePrice(31000m, 1),
            CreatePrice(32000m, 2), // High
            CreatePrice(31500m, 3)  // Current
        };

        var stochastic = new StochasticOscillator(period: 4);

        // Act
        var result = (StochasticResult)stochastic.Calculate(prices);

        // Assert
        // K% = (Current - Low) / (High - Low) * 100
        // K% = (31500 - 30000) / (32000 - 30000) * 100 = 75
        result.Value.Should().Be(75m);
        result.StartTime.Should().Be(prices[0].Timestamp);
        result.EndTime.Should().Be(prices[3].Timestamp);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_WithInvalidPeriod_ShouldThrowArgumentException(int invalidPeriod)
    {
        // Act
        var act = () => new StochasticOscillator(invalidPeriod);

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

        var stochastic = new StochasticOscillator(period: 3);

        // Act
        var act = () => stochastic.Calculate(prices);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Insufficient data points. Need at least 3 prices, but got 2*");
    }

    [Fact]
    public void Calculate_WithConstantPrice_ShouldReturn50()
    {
        // Arrange
        var constantPrice = 1000m;
        var prices = Enumerable.Range(0, 4)
            .Select(i => CreatePrice(constantPrice, i))
            .ToArray();

        var stochastic = new StochasticOscillator(period: 4);

        // Act
        var result = (StochasticResult)stochastic.Calculate(prices);

        // Assert
        result.Value.Should().Be(50m);
    }

    [Fact]
    public void Calculate_WithCurrentAtHighest_ShouldReturn100()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(30000m, 0),
            CreatePrice(31000m, 1),
            CreatePrice(30500m, 2),
            CreatePrice(32000m, 3)  // Current at highest
        };

        var stochastic = new StochasticOscillator(period: 4);

        // Act
        var result = (StochasticResult)stochastic.Calculate(prices);

        // Assert
        result.Value.Should().Be(100m);
    }

    [Fact]
    public void Calculate_WithCurrentAtLowest_ShouldReturn0()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(31000m, 0),
            CreatePrice(32000m, 1),
            CreatePrice(31500m, 2),
            CreatePrice(30000m, 3)  // Current at lowest
        };

        var stochastic = new StochasticOscillator(period: 4);

        // Act
        var result = (StochasticResult)stochastic.Calculate(prices);

        // Assert
        result.Value.Should().Be(0m);
    }

    private CryptoPrice CreatePrice(decimal value, int minutesOffset) =>
        CryptoPrice.Create(_btc, value, _baseTime.AddMinutes(minutesOffset));
}

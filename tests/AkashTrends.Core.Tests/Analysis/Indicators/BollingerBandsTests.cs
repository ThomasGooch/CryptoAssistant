using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.Indicators;

public class BollingerBandsTests
{
    private readonly CryptoCurrency _btc;
    private readonly DateTimeOffset _baseTime;

    public BollingerBandsTests()
    {
        _btc = CryptoCurrency.Create("BTC");
        _baseTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }

    [Fact]
    public void Calculate_WithValidPrices_ShouldReturnCorrectBands()
    {
        // Arrange
        var prices = new[]
        {
            CreatePrice(30000m, 0),
            CreatePrice(31000m, 1),
            CreatePrice(32000m, 2),
            CreatePrice(31500m, 3),
            CreatePrice(30500m, 4)
        };

        var bands = new BollingerBands(period: 5, standardDeviations: 2);

        // Act
        var result = (BollingerBandsResult)bands.Calculate(prices);

        // Assert
        // Middle Band (SMA) = (30000 + 31000 + 32000 + 31500 + 30500) / 5 = 31000
        // Standard Deviation = sqrt(((30000-31000)² + (31000-31000)² + (32000-31000)² + (31500-31000)² + (30500-31000)²) / 5)
        // = sqrt((1000000 + 0 + 1000000 + 250000 + 250000) / 5) = 707.107
        // Upper Band = 31000 + (2 * 707.107) = 32414.214
        // Lower Band = 31000 - (2 * 707.107) = 29585.786

        result.MiddleBand.Should().BeApproximately(31000m, 0.01m);
        result.UpperBand.Should().BeApproximately(32414.21m, 0.01m);
        result.LowerBand.Should().BeApproximately(29585.79m, 0.01m);
        result.StartTime.Should().Be(prices[0].Timestamp);
        result.EndTime.Should().Be(prices[4].Timestamp);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_WithInvalidPeriod_ShouldThrowArgumentException(int invalidPeriod)
    {
        // Act
        var act = () => new BollingerBands(invalidPeriod, 2);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Period must be greater than 0*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_WithInvalidStandardDeviations_ShouldThrowArgumentException(int invalidStdDev)
    {
        // Act
        var act = () => new BollingerBands(20, invalidStdDev);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Standard deviations must be greater than 0*");
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

        var bands = new BollingerBands(period: 3);

        // Act
        var act = () => bands.Calculate(prices);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Insufficient data points. Need at least 3 prices, but got 2*");
    }

    [Fact]
    public void Calculate_WithConstantPrice_ShouldReturnEqualBands()
    {
        // Arrange
        var constantPrice = 1000m;
        var prices = Enumerable.Range(0, 5)
            .Select(i => CreatePrice(constantPrice, i))
            .ToArray();

        var bands = new BollingerBands(period: 5);

        // Act
        var result = (BollingerBandsResult)bands.Calculate(prices);

        // Assert
        result.MiddleBand.Should().Be(constantPrice);
        result.UpperBand.Should().Be(constantPrice);
        result.LowerBand.Should().Be(constantPrice);
    }

    private CryptoPrice CreatePrice(decimal value, int minutesOffset) =>
        CryptoPrice.Create(_btc, value, _baseTime.AddMinutes(minutesOffset));
}

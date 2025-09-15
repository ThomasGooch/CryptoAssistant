using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.Indicators;

public class WilliamsPercentRTests
{
    private readonly CryptoCurrency _btc;
    private readonly DateTimeOffset _baseTime;

    public WilliamsPercentRTests()
    {
        _btc = CryptoCurrency.Create("BTC");
        _baseTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }
    [Fact]
    public void Constructor_WithValidPeriod_ShouldCreateInstance()
    {
        // Arrange & Act
        var williamsR = new WilliamsPercentR(14);

        // Assert
        williamsR.Should().NotBeNull();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-10)]
    public void Constructor_WithInvalidPeriod_ShouldThrowArgumentException(int period)
    {
        // Arrange & Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => new WilliamsPercentR(period));
        exception.Message.Should().Contain("Period must be greater than 0");
    }

    [Fact]
    public void Calculate_WithNullPrices_ShouldThrowArgumentException()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(14);

        // Act & Assert
        Assert.Throws<ArgumentException>(() => williamsR.Calculate(null));
    }

    [Fact]
    public void Calculate_WithInsufficientData_ShouldThrowArgumentException()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(14);
        var prices = GeneratePrices(10); // Less than required 14

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => williamsR.Calculate(prices));
        exception.Message.Should().Contain("Insufficient data points");
        exception.Message.Should().Contain("Need at least 14 prices, but got 10");
    }

    [Fact]
    public void Calculate_WithUnsortedPrices_ShouldThrowArgumentException()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(3);
        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(_btc, 100m, DateTimeOffset.Now.AddMinutes(2)),
            CryptoPrice.Create(_btc, 101m, DateTimeOffset.Now.AddMinutes(1)), // Out of order
            CryptoPrice.Create(_btc, 102m, DateTimeOffset.Now.AddMinutes(3))
        };

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => williamsR.Calculate(prices));
        exception.Message.Should().Contain("sorted by timestamp");
    }

    [Fact]
    public void Calculate_WithValidData_ShouldReturnResultInRange()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(5);
        var prices = GenerateVariedPrices(10); // Mix of high and low prices

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.Should().NotBeNull();
        result.Value.Should().BeInRange(-100m, 0m); // Williams %R is always between -100 and 0
    }

    [Fact]
    public void Calculate_WithCurrentPriceAtHigh_ShouldReturnZero()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(5);
        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(_btc, 95m, DateTimeOffset.Now.AddMinutes(-4)),
            CryptoPrice.Create(_btc, 96m, DateTimeOffset.Now.AddMinutes(-3)),
            CryptoPrice.Create(_btc, 97m, DateTimeOffset.Now.AddMinutes(-2)),
            CryptoPrice.Create(_btc, 98m, DateTimeOffset.Now.AddMinutes(-1)),
            CryptoPrice.Create(_btc, 100m, DateTimeOffset.Now) // Highest price is current
        };

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.Value.Should().Be(0m); // Current close at high = 0%
    }

    [Fact]
    public void Calculate_WithCurrentPriceAtLow_ShouldReturnMinusHundred()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(5);
        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(_btc, 100m, DateTimeOffset.Now.AddMinutes(-4)),
            CryptoPrice.Create(_btc, 99m, DateTimeOffset.Now.AddMinutes(-3)),
            CryptoPrice.Create(_btc, 98m, DateTimeOffset.Now.AddMinutes(-2)),
            CryptoPrice.Create(_btc, 97m, DateTimeOffset.Now.AddMinutes(-1)),
            CryptoPrice.Create(_btc, 95m, DateTimeOffset.Now) // Lowest price is current
        };

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.Value.Should().Be(-100m); // Current close at low = -100%
    }

    [Fact]
    public void Calculate_WithCurrentPriceInMiddle_ShouldReturnMiddleValue()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(5);
        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(_btc, 90m, DateTimeOffset.Now.AddMinutes(-4)), // Low
            CryptoPrice.Create(_btc, 95m, DateTimeOffset.Now.AddMinutes(-3)),
            CryptoPrice.Create(_btc, 110m, DateTimeOffset.Now.AddMinutes(-2)), // High
            CryptoPrice.Create(_btc, 105m, DateTimeOffset.Now.AddMinutes(-1)),
            CryptoPrice.Create(_btc, 100m, DateTimeOffset.Now) // Middle: (110-100)/(110-90) = 10/20 = 0.5 * -100 = -50
        };

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.Value.Should().Be(-50m); // Exactly in the middle
    }

    [Fact]
    public void Calculate_WithNoRange_ShouldReturnNeutralValue()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(5);
        var prices = GenerateFlatPrices(5, 100m); // All prices the same

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.Value.Should().Be(-50m); // Neutral value when no range
    }

    [Fact]
    public void Calculate_ShouldSetCorrectTimeStamps()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(5);
        var startTime = DateTimeOffset.Now.AddHours(-1);
        var endTime = DateTimeOffset.Now;
        var prices = GeneratePricesWithTimeRange(10, 100m, startTime, endTime);

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.StartTime.Should().BeCloseTo(startTime, TimeSpan.FromMilliseconds(100));
        result.EndTime.Should().BeCloseTo(endTime, TimeSpan.FromMilliseconds(100));
    }

    [Theory]
    [InlineData(5)]
    [InlineData(10)]
    [InlineData(14)]
    [InlineData(21)]
    public void Calculate_WithDifferentPeriods_ShouldWork(int period)
    {
        // Arrange
        var williamsR = new WilliamsPercentR(period);
        var prices = GenerateVariedPrices(period + 5); // Ensure enough data

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.Should().NotBeNull();
        result.Value.Should().BeInRange(-100m, 0m);
    }

    [Fact]
    public void Calculate_WithOverboughtCondition_ShouldReturnHighValue()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(5);
        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(_btc, 90m, DateTimeOffset.Now.AddMinutes(-4)), // Low
            CryptoPrice.Create(_btc, 95m, DateTimeOffset.Now.AddMinutes(-3)),
            CryptoPrice.Create(_btc, 110m, DateTimeOffset.Now.AddMinutes(-2)), // High
            CryptoPrice.Create(_btc, 105m, DateTimeOffset.Now.AddMinutes(-1)),
            CryptoPrice.Create(_btc, 108m, DateTimeOffset.Now) // Near high = potentially overbought
        };

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.Value.Should().BeGreaterThan(-20m); // High values indicate overbought (closer to 0)
    }

    [Fact]
    public void Calculate_WithOversoldCondition_ShouldReturnLowValue()
    {
        // Arrange
        var williamsR = new WilliamsPercentR(5);
        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(_btc, 90m, DateTimeOffset.Now.AddMinutes(-4)), // Low
            CryptoPrice.Create(_btc, 95m, DateTimeOffset.Now.AddMinutes(-3)),
            CryptoPrice.Create(_btc, 110m, DateTimeOffset.Now.AddMinutes(-2)), // High
            CryptoPrice.Create(_btc, 105m, DateTimeOffset.Now.AddMinutes(-1)),
            CryptoPrice.Create(_btc, 92m, DateTimeOffset.Now) // Near low = potentially oversold
        };

        // Act
        var result = williamsR.Calculate(prices);

        // Assert
        result.Value.Should().BeLessThan(-80m); // Low values indicate oversold (closer to -100)
    }

    private List<CryptoPrice> GeneratePrices(int count)
    {
        var prices = new List<CryptoPrice>();
        var baseTime = DateTimeOffset.Now.AddMinutes(-count);

        for (int i = 0; i < count; i++)
        {
            prices.Add(CryptoPrice.Create(_btc, 100m + i, baseTime.AddMinutes(i)));
        }

        return prices;
    }

    private List<CryptoPrice> GenerateVariedPrices(int count)
    {
        var prices = new List<CryptoPrice>();
        var baseTime = DateTimeOffset.Now.AddMinutes(-count);
        var random = new Random(42); // Fixed seed for reproducible tests

        for (int i = 0; i < count; i++)
        {
            var price = 100m + (decimal)(random.NextDouble() * 20 - 10); // Random price between 90-110
            prices.Add(CryptoPrice.Create(_btc, price, baseTime.AddMinutes(i)));
        }

        return prices;
    }

    private List<CryptoPrice> GenerateFlatPrices(int count, decimal price)
    {
        var prices = new List<CryptoPrice>();
        var baseTime = DateTimeOffset.Now.AddMinutes(-count);

        for (int i = 0; i < count; i++)
        {
            prices.Add(CryptoPrice.Create(_btc, price, baseTime.AddMinutes(i)));
        }

        return prices;
    }

    private List<CryptoPrice> GeneratePricesWithTimeRange(int count, decimal basePrice, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        var prices = new List<CryptoPrice>();
        var timeStep = (endTime - startTime).TotalMinutes / (count - 1);

        for (int i = 0; i < count; i++)
        {
            var timestamp = startTime.AddMinutes(i * timeStep);
            prices.Add(CryptoPrice.Create(_btc, basePrice + i, timestamp));
        }

        return prices;
    }
}
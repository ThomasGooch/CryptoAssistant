using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.Indicators;

public class MACDTests
{
    private readonly CryptoCurrency _btc;
    private readonly DateTimeOffset _baseTime;

    public MACDTests()
    {
        _btc = CryptoCurrency.Create("BTC");
        _baseTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);
    }
    [Fact]
    public void Constructor_WithValidParameters_ShouldCreateInstance()
    {
        // Arrange & Act
        var macd = new MACD(12, 26, 9);

        // Assert
        macd.Should().NotBeNull();
    }

    [Fact]
    public void Constructor_WithDefaultParameters_ShouldCreateInstance()
    {
        // Arrange & Act
        var macd = new MACD();

        // Assert
        macd.Should().NotBeNull();
    }

    [Theory]
    [InlineData(0, 26, 9)]
    [InlineData(-1, 26, 9)]
    [InlineData(12, 0, 9)]
    [InlineData(12, -1, 9)]
    [InlineData(12, 26, 0)]
    [InlineData(12, 26, -1)]
    public void Constructor_WithInvalidPeriods_ShouldThrowArgumentException(int fastPeriod, int slowPeriod, int signalPeriod)
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentException>(() => new MACD(fastPeriod, slowPeriod, signalPeriod));
    }

    [Fact]
    public void Constructor_WithFastPeriodGreaterThanSlowPeriod_ShouldThrowArgumentException()
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentException>(() => new MACD(26, 12, 9));
    }

    [Fact]
    public void Calculate_WithNullPrices_ShouldThrowArgumentException()
    {
        // Arrange
        var macd = new MACD();

        // Act & Assert
        Assert.Throws<ArgumentException>(() => macd.Calculate(null));
    }

    [Fact]
    public void Calculate_WithInsufficientData_ShouldThrowArgumentException()
    {
        // Arrange
        var macd = new MACD(12, 26, 9);
        var prices = GeneratePrices(30); // Need at least 26 + 9 = 35 prices

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => macd.Calculate(prices));
        exception.Message.Should().Contain("Insufficient data points");
    }

    [Fact]
    public void Calculate_WithUnsortedPrices_ShouldThrowArgumentException()
    {
        // Arrange
        var macd = new MACD();
        var prices = new List<CryptoPrice>();
        var baseTime = DateTimeOffset.Now;
        
        // Generate enough data points but in wrong order
        for (int i = 0; i < 40; i++)
        {
            prices.Add(CryptoPrice.Create(_btc, 100m + i, baseTime.AddMinutes(i)));
        }
        
        // Now make them out of order by swapping two elements
        var temp = prices[10];
        prices[10] = prices[20];
        prices[20] = temp;

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => macd.Calculate(prices));
        exception.Message.Should().Contain("sorted by timestamp");
    }

    [Fact]
    public void Calculate_WithValidData_ShouldReturnMACDResult()
    {
        // Arrange
        var macd = new MACD(5, 10, 3); // Smaller periods for easier testing
        var prices = GenerateIncreasingPrices(20, 100m, 1m); // 20 prices starting at 100, increasing by 1

        // Act
        var result = macd.Calculate(prices);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeOfType<MACDResult>();

        var macdResult = result as MACDResult;
        macdResult!.FastPeriod.Should().Be(5);
        macdResult.SlowPeriod.Should().Be(10);
        macdResult.SignalPeriod.Should().Be(3);

        // With increasing prices, MACD line should be positive (fast EMA > slow EMA)
        macdResult.MACDLine.Should().BePositive();

        // Histogram is MACD line - signal line
        macdResult.Histogram.Should().Be(macdResult.MACDLine - macdResult.SignalLine);

        // Value should equal MACD line (base class behavior)
        macdResult.Value.Should().Be(macdResult.MACDLine);
    }

    [Fact]
    public void Calculate_WithDecreasingPrices_ShouldReturnNegativeMACDLine()
    {
        // Arrange
        var macd = new MACD(5, 10, 3);
        var prices = GenerateDecreasingPrices(20, 120m, 1m); // 20 prices starting at 120, decreasing by 1

        // Act
        var result = macd.Calculate(prices);

        // Assert
        var macdResult = result as MACDResult;

        // With decreasing prices, MACD line should be negative (fast EMA < slow EMA)
        macdResult!.MACDLine.Should().BeNegative();
    }

    [Fact]
    public void Calculate_WithFlatPrices_ShouldReturnZeroMACDLine()
    {
        // Arrange
        var macd = new MACD(5, 10, 3);
        var prices = GenerateFlatPrices(20, 100m); // 20 prices all at 100

        // Act
        var result = macd.Calculate(prices);

        // Assert
        var macdResult = result as MACDResult;

        // With flat prices, MACD line should be close to zero
        macdResult!.MACDLine.Should().BeInRange(-0.1m, 0.1m);
        macdResult.SignalLine.Should().BeInRange(-0.1m, 0.1m);
        macdResult.Histogram.Should().BeInRange(-0.1m, 0.1m);
    }

    [Fact]
    public void Calculate_ShouldSetCorrectTimeStamps()
    {
        // Arrange
        var macd = new MACD(5, 10, 3);
        var startTime = DateTimeOffset.Now.AddHours(-1);
        var endTime = DateTimeOffset.Now;
        var prices = GeneratePricesWithTimeRange(20, 100m, startTime, endTime);

        // Act
        var result = macd.Calculate(prices);

        // Assert
        result.StartTime.Should().BeCloseTo(startTime, TimeSpan.FromMilliseconds(100));
        result.EndTime.Should().BeCloseTo(endTime, TimeSpan.FromMilliseconds(100));
    }

    private List<CryptoPrice> GeneratePrices(int count)
    {
        var prices = new List<CryptoPrice>();
        var baseTime = DateTimeOffset.Now.AddHours(-count);

        for (int i = 0; i < count; i++)
        {
            prices.Add(CryptoPrice.Create(_btc, 100m + i, baseTime.AddMinutes(i)));
        }

        return prices;
    }

    private List<CryptoPrice> GenerateIncreasingPrices(int count, decimal startPrice, decimal increment)
    {
        var prices = new List<CryptoPrice>();
        var baseTime = DateTimeOffset.Now.AddHours(-count);

        for (int i = 0; i < count; i++)
        {
            prices.Add(CryptoPrice.Create(_btc, startPrice + (i * increment), baseTime.AddMinutes(i)));
        }

        return prices;
    }

    private List<CryptoPrice> GenerateDecreasingPrices(int count, decimal startPrice, decimal decrement)
    {
        var prices = new List<CryptoPrice>();
        var baseTime = DateTimeOffset.Now.AddHours(-count);

        for (int i = 0; i < count; i++)
        {
            prices.Add(CryptoPrice.Create(_btc, startPrice - (i * decrement), baseTime.AddMinutes(i)));
        }

        return prices;
    }

    private List<CryptoPrice> GenerateFlatPrices(int count, decimal price)
    {
        var prices = new List<CryptoPrice>();
        var baseTime = DateTimeOffset.Now.AddHours(-count);

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
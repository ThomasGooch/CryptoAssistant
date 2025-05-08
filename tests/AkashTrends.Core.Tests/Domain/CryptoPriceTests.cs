using FluentAssertions;
using AkashTrends.Core.Domain;
using Xunit;

namespace AkashTrends.Core.Tests.Domain;

public class CryptoPriceTests
{
    [Fact]
    public void Create_WithValidValues_ShouldCreateCryptoPrice()
    {
        // Arrange
        var currency = CryptoCurrency.Create("BTC");
        var price = 50000.00m;
        var timestamp = DateTimeOffset.UtcNow;

        // Act
        var cryptoPrice = CryptoPrice.Create(currency, price, timestamp);

        // Assert
        cryptoPrice.Currency.Should().Be(currency);
        cryptoPrice.Value.Should().Be(price);
        cryptoPrice.Timestamp.Should().Be(timestamp);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-0.01)]
    public void Create_WithNegativePrice_ShouldThrowArgumentException(decimal invalidPrice)
    {
        // Arrange
        var currency = CryptoCurrency.Create("BTC");
        var timestamp = DateTimeOffset.UtcNow;

        // Act
        var act = () => CryptoPrice.Create(currency, invalidPrice, timestamp);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Price cannot be negative (Parameter 'price')");
    }

    [Fact]
    public void Create_WithPriceAboveMaximum_ShouldThrowArgumentException()
    {
        // Arrange
        var currency = CryptoCurrency.Create("BTC");
        var timestamp = DateTimeOffset.UtcNow;
        var tooHighPrice = 1_000_000_000_001m; // 1 trillion + 1

        // Act
        var act = () => CryptoPrice.Create(currency, tooHighPrice, timestamp);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Price exceeds maximum allowed value (Parameter 'price')");
    }

    [Fact]
    public void Create_WithNullCurrency_ShouldThrowArgumentNullException()
    {
        // Arrange
        var price = 50000.00m;
        var timestamp = DateTimeOffset.UtcNow;

        // Act
        var act = () => CryptoPrice.Create(null!, price, timestamp);

        // Assert
        act.Should().Throw<ArgumentNullException>()
           .WithParameterName("currency");
    }
}

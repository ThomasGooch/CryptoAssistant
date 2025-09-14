using FluentAssertions;
using AkashTrends.Core.Domain;
using Xunit;

namespace AkashTrends.Core.Tests.Domain;

public class CryptoCurrencyTests
{
    [Fact]
    public void Create_WithValidSymbol_ShouldCreateCryptoCurrency()
    {
        // Arrange
        const string symbol = "BTC";

        // Act
        var crypto = CryptoCurrency.Create(symbol);

        // Assert
        crypto.Symbol.Should().Be(symbol);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public void Create_WithInvalidSymbol_ShouldThrowArgumentException(string? invalidSymbol)
    {
        // Act
        var act = () => CryptoCurrency.Create(invalidSymbol!);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Cryptocurrency symbol cannot be empty or null*");
    }
}

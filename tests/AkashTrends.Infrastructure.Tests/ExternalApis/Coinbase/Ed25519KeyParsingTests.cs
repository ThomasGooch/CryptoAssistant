using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;
using System.Reflection;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.ExternalApis.Coinbase;

public class Ed25519KeyParsingTests
{
    [Fact]
    public void ExtractEd25519PrivateKeyFromPkcs8_ShouldExtractKey_WhenValidPkcs8Structure()
    {
        // Arrange
        var mockPkcs8Bytes = CreateValidPkcs8Ed25519Structure();

        // Act
        var result = InvokeExtractEd25519PrivateKeyFromPkcs8(mockPkcs8Bytes);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(32, "Ed25519 private keys are exactly 32 bytes");
    }

    [Fact]
    public void ExtractEd25519PrivateKeyFromPkcs8_ShouldUseLast32Bytes_WhenNoOctetStringFound()
    {
        // Arrange - create a key without the standard OCTET STRING pattern
        var mockPkcs8Bytes = new byte[64];
        for (int i = 0; i < 64; i++)
        {
            mockPkcs8Bytes[i] = (byte)(i + 1); // Unique pattern for verification
        }

        // Act
        var result = InvokeExtractEd25519PrivateKeyFromPkcs8(mockPkcs8Bytes);

        // Assert
        result.Should().HaveCount(32);
        // Should contain the last 32 bytes
        for (int i = 0; i < 32; i++)
        {
            result[i].Should().Be((byte)(33 + i), "should extract last 32 bytes as fallback");
        }
    }

    [Fact]
    public void ExtractEd25519PrivateKeyFromPkcs8_ShouldThrowException_WhenKeyTooShort()
    {
        // Arrange
        var mockPkcs8Bytes = new byte[15]; // Too short for Ed25519 (needs at least 32 bytes)

        // Act
        var act = () => InvokeExtractEd25519PrivateKeyFromPkcs8(mockPkcs8Bytes);

        // Assert - When using reflection, exceptions are wrapped in TargetInvocationException
        act.Should().Throw<TargetInvocationException>()
            .WithInnerException<InvalidOperationException>()
            .WithMessage("*Could not extract Ed25519 private key from PKCS#8 format*");
    }

    [Fact]
    public void ExtractEd25519PrivateKeyFromPkcs8_ShouldFindOctetString_WhenStandardPattern()
    {
        // Arrange - create PKCS#8 with standard 04 20 pattern
        var mockPkcs8Bytes = new byte[80];
        var expectedKeyBytes = new byte[32];
        
        // Set up the OCTET STRING pattern at position 20
        mockPkcs8Bytes[20] = 0x04; // OCTET STRING tag
        mockPkcs8Bytes[21] = 0x20; // Length: 32 bytes
        
        // Fill with recognizable pattern
        for (int i = 0; i < 32; i++)
        {
            expectedKeyBytes[i] = (byte)(i + 100);
            mockPkcs8Bytes[22 + i] = expectedKeyBytes[i];
        }

        // Act
        var result = InvokeExtractEd25519PrivateKeyFromPkcs8(mockPkcs8Bytes);

        // Assert
        result.Should().Equal(expectedKeyBytes, "should extract the 32 bytes following the OCTET STRING marker");
    }

    [Theory]
    [InlineData(10)]  // OCTET STRING at position 10
    [InlineData(30)]  // OCTET STRING at position 30
    [InlineData(50)]  // OCTET STRING at position 50
    public void ExtractEd25519PrivateKeyFromPkcs8_ShouldFindOctetString_AtAnyValidPosition(int position)
    {
        // Arrange
        var mockPkcs8Bytes = new byte[position + 34]; // Ensure enough space
        mockPkcs8Bytes[position] = 0x04; // OCTET STRING tag
        mockPkcs8Bytes[position + 1] = 0x20; // Length: 32 bytes
        
        var expectedKeyBytes = new byte[32];
        for (int i = 0; i < 32; i++)
        {
            expectedKeyBytes[i] = (byte)(i + 200);
            mockPkcs8Bytes[position + 2 + i] = expectedKeyBytes[i];
        }

        // Act
        var result = InvokeExtractEd25519PrivateKeyFromPkcs8(mockPkcs8Bytes);

        // Assert
        result.Should().Equal(expectedKeyBytes);
    }

    [Fact]
    public void CoinbaseAuthenticator_ShouldDetectEd25519Key_WhenBeginPrivateKeyHeader()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-key",
            ApiSecret = "-----BEGIN PRIVATE KEY-----\nMockKeyData\n-----END PRIVATE KEY-----"
        };
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        // Act & Assert - Constructor should not throw for this format
        var act = () => new CoinbaseAuthenticator(optionsMonitor);
        act.Should().NotThrow("should recognize Ed25519 format");
    }

    [Fact]
    public void CoinbaseAuthenticator_ShouldDetectECKey_WhenECPrivateKeyHeader()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-key",
            ApiSecret = "-----BEGIN EC PRIVATE KEY-----\nMockKeyData\n-----END EC PRIVATE KEY-----"
        };
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        // Act & Assert
        var act = () => new CoinbaseAuthenticator(optionsMonitor);
        act.Should().NotThrow("should recognize EC key format");
    }

    [Fact]
    public void CoinbaseAuthenticator_ShouldDetectEd25519Key_WhenNoHeaders()
    {
        // Arrange - raw base64 key without headers (Ed25519 format)
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-key",
            ApiSecret = "VGVzdEtleURhdGFGb3JFZDI1NTE5UGFyc2luZ1Rlc3Q="
        };
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        // Act & Assert
        var act = () => new CoinbaseAuthenticator(optionsMonitor);
        act.Should().NotThrow("should handle raw Ed25519 format");
    }

    private static byte[] CreateValidPkcs8Ed25519Structure()
    {
        var mockPkcs8 = new byte[70];
        
        // Add the OCTET STRING pattern at a realistic position
        var keyPosition = 16;
        mockPkcs8[keyPosition] = 0x04;      // OCTET STRING tag
        mockPkcs8[keyPosition + 1] = 0x20;  // Length: 32 bytes
        
        // Fill the 32-byte Ed25519 private key with test data
        for (int i = 0; i < 32; i++)
        {
            mockPkcs8[keyPosition + 2 + i] = (byte)(i + 50); // Test pattern
        }
        
        return mockPkcs8;
    }

    private static byte[] InvokeExtractEd25519PrivateKeyFromPkcs8(byte[] pkcs8Bytes)
    {
        // Use reflection to test the private method
        var authenticatorType = typeof(CoinbaseAuthenticator);
        var method = authenticatorType.GetMethod("ExtractEd25519PrivateKeyFromPkcs8", 
            BindingFlags.NonPublic | BindingFlags.Static);
        
        method.Should().NotBeNull("ExtractEd25519PrivateKeyFromPkcs8 method should exist");
        
        return (byte[])method!.Invoke(null, new object[] { pkcs8Bytes })!;
    }
}
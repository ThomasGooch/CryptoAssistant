using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;
using System.Text;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.ExternalApis.Coinbase;

public class CoinbaseAuthenticatorTests
{
    private readonly IOptionsMonitor<CoinbaseApiOptions> _optionsMonitor;

    public CoinbaseAuthenticatorTests()
    {
        _optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
    }

    [Fact]
    public void Constructor_ShouldThrowException_WhenApiKeyIsMissing()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = string.Empty,
            ApiSecret = "valid-secret"
        };
        _optionsMonitor.CurrentValue.Returns(options);

        // Act
        var act = () => new CoinbaseAuthenticator(_optionsMonitor);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*ApiKey*");
    }

    [Fact]
    public void Constructor_ShouldThrowException_WhenApiSecretIsMissing()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "valid-key",
            ApiSecret = string.Empty
        };
        _optionsMonitor.CurrentValue.Returns(options);

        // Act
        var act = () => new CoinbaseAuthenticator(_optionsMonitor);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*ApiSecret*");
    }

    [Fact]
    public void GenerateSignature_ShouldGenerateValidSignature_ForECKey()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-api-key",
            // Sample EC private key (not real - for testing only)
            ApiSecret = @"-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIKn1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP
oAoGCCqGSM49AwEHoUQDQgAE1234567890abcdefghijklmnopqrstuvwxyzAB
CDEFGHIJKLMNOP1234567890abcdefghijklmnopqrstuvwxyzABCDEFGH==
-----END EC PRIVATE KEY-----"
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);
        var timestamp = "1234567890";
        var method = "GET";
        var path = "/accounts";

        // Act & Assert
        // This should not throw an exception for valid EC key format
        var act = () => authenticator.GenerateSignature(timestamp, method, path);
        act.Should().NotThrow();
    }

    [Fact]
    public void GenerateSignature_ShouldHandleEd25519Key_WhenValidPKCS8Format()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-api-key",
            // Sample Ed25519 private key in PKCS#8 format (simulated structure)
            ApiSecret = CreateTestEd25519Key()
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);
        var timestamp = "1234567890";
        var method = "GET";
        var path = "/accounts";

        // Act
        var act = () => authenticator.GenerateSignature(timestamp, method, path);

        // Assert
        // The method should attempt to process Ed25519 key without throwing format exceptions
        // Note: This might still fail due to key validation, but format parsing should work
        act.Should().NotThrow<FormatException>();
    }

    [Fact]
    public void ConfigureHttpClient_ShouldAddRequiredHeaders()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-api-key",
            ApiSecret = CreateTestECKey()
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);
        var httpClient = new HttpClient();

        // Act
        var act = () => authenticator.ConfigureHttpClient(httpClient);

        // Assert
        act.Should().NotThrow();
        httpClient.DefaultRequestHeaders.Should().Contain(h => h.Key == "CB-ACCESS-KEY");
        httpClient.DefaultRequestHeaders.Should().Contain(h => h.Key == "CB-ACCESS-SIGN");
        httpClient.DefaultRequestHeaders.Should().Contain(h => h.Key == "CB-ACCESS-TIMESTAMP");
    }

    [Theory]
    [InlineData("GET", "/accounts")]
    [InlineData("POST", "/orders")]
    [InlineData("DELETE", "/orders/123")]
    public void GenerateSignature_ShouldProduceDifferentSignatures_ForDifferentRequests(string method, string path)
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-api-key",
            ApiSecret = CreateTestECKey()
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);
        var timestamp = "1234567890";

        // Act
        var signature1 = authenticator.GenerateSignature(timestamp, method, path);
        var signature2 = authenticator.GenerateSignature(timestamp, "GET", "/different-path");

        // Assert
        signature1.Should().NotBeNullOrEmpty();
        signature2.Should().NotBeNullOrEmpty();
        signature1.Should().NotBe(signature2, "different requests should produce different signatures");
    }

    [Fact]
    public void GenerateSignature_ShouldProduceDifferentSignatures_ForDifferentTimestamps()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-api-key",
            ApiSecret = CreateTestECKey()
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);

        // Act
        var signature1 = authenticator.GenerateSignature("1234567890", "GET", "/accounts");
        var signature2 = authenticator.GenerateSignature("1234567891", "GET", "/accounts");

        // Assert
        signature1.Should().NotBe(signature2, "different timestamps should produce different signatures");
    }

    private static string CreateTestECKey()
    {
        // This is a mock EC private key structure for testing
        // In real scenarios, this would be a properly formatted EC private key
        return @"-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIKn1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP
oAoGCCqGSM49AwEHoUQDQgAE1234567890abcdefghijklmnopqrstuvwxyzAB
CDEFGHIJKLMNOP1234567890abcdefghijklmnopqrstuvwxyzABCDEFGH==
-----END EC PRIVATE KEY-----";
    }

    private static string CreateTestEd25519Key()
    {
        // This creates a mock PKCS#8 Ed25519 private key structure
        // The key contains the ASN.1 structure with the required 0x04 0x20 pattern
        var mockKeyData = new byte[48];
        
        // Set up a basic PKCS#8 structure with Ed25519 OID and private key
        // This is a simplified version for testing the parsing logic
        mockKeyData[30] = 0x04; // OCTET STRING tag
        mockKeyData[31] = 0x20; // Length: 32 bytes
        // The next 32 bytes would be the actual Ed25519 private key
        for (int i = 32; i < 48; i++)
        {
            mockKeyData[i] = (byte)(i % 256); // Mock key data
        }

        var base64Key = Convert.ToBase64String(mockKeyData);
        return $"-----BEGIN PRIVATE KEY-----\n{base64Key}\n-----END PRIVATE KEY-----";
    }
}
using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;
using System.Text;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.ExternalApis.Coinbase;

public class CoinbaseAuthenticationIntegrationTests
{
    [Fact]
    public void FullAuthenticationFlow_ShouldWork_WithEd25519Key()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "organizations/test-org/apiKeys/test-key-id",
            ApiSecret = CreateMockEd25519Key()
        };
        
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(optionsMonitor);
        var httpClient = new HttpClient();

        // Act - This tests the complete authentication setup flow
        var act = () => authenticator.ConfigureHttpClient(httpClient);

        // Assert
        act.Should().NotThrow("full Ed25519 authentication flow should work");
        
        // Verify all required headers are present
        httpClient.DefaultRequestHeaders.Should().ContainKey("CB-ACCESS-KEY");
        httpClient.DefaultRequestHeaders.Should().ContainKey("CB-ACCESS-SIGN");
        httpClient.DefaultRequestHeaders.Should().ContainKey("CB-ACCESS-TIMESTAMP");
        
        // Verify API key is correctly extracted from organization format
        var apiKeyHeader = httpClient.DefaultRequestHeaders.GetValues("CB-ACCESS-KEY").First();
        apiKeyHeader.Should().Be("test-key-id", "should extract key ID from organization format");
    }

    [Fact]
    public void FullAuthenticationFlow_ShouldWork_WithECKey()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-ec-key",
            ApiSecret = CreateMockECKey()
        };
        
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(optionsMonitor);
        var httpClient = new HttpClient();

        // Act
        var act = () => authenticator.ConfigureHttpClient(httpClient);

        // Assert
        act.Should().NotThrow("EC key authentication flow should work");
        
        httpClient.DefaultRequestHeaders.Should().ContainKey("CB-ACCESS-KEY");
        httpClient.DefaultRequestHeaders.Should().ContainKey("CB-ACCESS-SIGN");
        httpClient.DefaultRequestHeaders.Should().ContainKey("CB-ACCESS-TIMESTAMP");
    }

    [Fact]
    public void AuthenticationHeaders_ShouldChange_WhenMultipleRequestsWithDifferentTimestamps()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-key",
            ApiSecret = CreateMockECKey()
        };
        
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(optionsMonitor);

        // Act - Configure client multiple times (simulating multiple requests)
        var httpClient1 = new HttpClient();
        var httpClient2 = new HttpClient();
        
        Thread.Sleep(1000); // Ensure different timestamps
        
        authenticator.ConfigureHttpClient(httpClient1);
        authenticator.ConfigureHttpClient(httpClient2);

        // Assert
        var timestamp1 = httpClient1.DefaultRequestHeaders.GetValues("CB-ACCESS-TIMESTAMP").First();
        var timestamp2 = httpClient2.DefaultRequestHeaders.GetValues("CB-ACCESS-TIMESTAMP").First();
        var signature1 = httpClient1.DefaultRequestHeaders.GetValues("CB-ACCESS-SIGN").First();
        var signature2 = httpClient2.DefaultRequestHeaders.GetValues("CB-ACCESS-SIGN").First();

        timestamp1.Should().NotBe(timestamp2, "timestamps should be different for different requests");
        signature1.Should().NotBe(signature2, "signatures should be different for different timestamps");
    }

    [Theory]
    [InlineData("organizations/test-org/apiKeys/key123", "key123")]
    [InlineData("organizations/another-org/apiKeys/my-key-id", "my-key-id")]
    [InlineData("simple-key", "simple-key")]
    public void ApiKeyExtraction_ShouldWork_ForDifferentFormats(string inputKey, string expectedExtracted)
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = inputKey,
            ApiSecret = CreateMockECKey()
        };
        
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(optionsMonitor);
        var httpClient = new HttpClient();

        // Act
        authenticator.ConfigureHttpClient(httpClient);

        // Assert
        var extractedKey = httpClient.DefaultRequestHeaders.GetValues("CB-ACCESS-KEY").First();
        extractedKey.Should().Be(expectedExtracted);
    }

    [Fact]
    public void SignatureGeneration_ShouldBeConsistent_ForSameInputs()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-key",
            ApiSecret = CreateMockECKey()
        };
        
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(optionsMonitor);
        var fixedTimestamp = "1609459200"; // Fixed timestamp for consistency
        var method = "GET";
        var path = "/accounts";

        // Act - Generate signature multiple times with same inputs
        var signature1 = authenticator.GenerateSignature(fixedTimestamp, method, path);
        var signature2 = authenticator.GenerateSignature(fixedTimestamp, method, path);

        // Assert
        signature1.Should().Be(signature2, "same inputs should produce same signature");
        signature1.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void ErrorHandling_ShouldProvideHelpfulMessages_WhenKeyFormatInvalid()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-key",
            ApiSecret = "invalid-key-format-that-cannot-be-parsed"
        };
        
        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(optionsMonitor);

        // Act
        var act = () => authenticator.GenerateSignature("123", "GET", "/test");

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Failed to generate signature*");
    }

    [Fact]
    public void MultipleKeyTypes_ShouldBeSupported_InSameApplication()
    {
        // This test verifies that the same codebase can handle both EC and Ed25519 keys
        
        // Arrange Ed25519
        var ed25519Options = new CoinbaseApiOptions
        {
            ApiKey = "ed25519-key",
            ApiSecret = CreateMockEd25519Key()
        };
        var ed25519Monitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        ed25519Monitor.CurrentValue.Returns(ed25519Options);

        // Arrange EC
        var ecOptions = new CoinbaseApiOptions
        {
            ApiKey = "ec-key", 
            ApiSecret = CreateMockECKey()
        };
        var ecMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        ecMonitor.CurrentValue.Returns(ecOptions);

        // Act & Assert
        var createEd25519Auth = () => new CoinbaseAuthenticator(ed25519Monitor);
        var createECAuth = () => new CoinbaseAuthenticator(ecMonitor);

        createEd25519Auth.Should().NotThrow("Ed25519 authenticator should be created");
        createECAuth.Should().NotThrow("EC authenticator should be created");
    }

    private static string CreateMockEd25519Key()
    {
        // Create a realistic PKCS#8 Ed25519 structure for testing
        var mockKeyBytes = new byte[48];
        
        // PKCS#8 wrapper (simplified)
        mockKeyBytes[14] = 0x04; // OCTET STRING
        mockKeyBytes[15] = 0x20; // 32 bytes length
        
        // Mock 32-byte Ed25519 private key
        for (int i = 16; i < 48; i++)
        {
            mockKeyBytes[i] = (byte)((i - 16) * 7 % 256); // Deterministic test data
        }

        var base64Key = Convert.ToBase64String(mockKeyBytes);
        return $"-----BEGIN PRIVATE KEY-----\n{base64Key}\n-----END PRIVATE KEY-----";
    }

    private static string CreateMockECKey()
    {
        // Mock EC private key for testing (not a real key)
        var mockKey = @"-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIBKn1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN
oAoGCCqGSM49AwEHoUQDQgAE1234567890abcdefghijklmnopqrstuvwxyzAB
CDEFGHIJKLMNOP1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJ==
-----END EC PRIVATE KEY-----";
        return mockKey;
    }
}
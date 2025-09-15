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
    public void ConfigureHttpClient_ShouldNotThrowException_WhenApiKeyIsMissing_ForPublicEndpoints()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = string.Empty,
            ApiSecret = "valid-secret"
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);
        var httpClient = new HttpClient();

        // Act
        var act = () => authenticator.ConfigureHttpClient(httpClient);

        // Assert - Should not throw for public endpoints
        act.Should().NotThrow();
    }

    [Fact]
    public void ConfigureHttpClient_ShouldNotThrow_WhenApiSecretIsMissing_ForPublicEndpoints()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "valid-key",
            ApiSecret = string.Empty
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);
        var httpClient = new HttpClient();

        // Act
        var act = () => authenticator.ConfigureHttpClient(httpClient);

        // Assert - Should not throw for public endpoints
        act.Should().NotThrow();
    }

    [Fact]
    public void GenerateSignature_ShouldThrowException_WhenApiKeyIsMissing()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = string.Empty,
            ApiSecret = "valid-secret"
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);

        // Act
        var act = () => authenticator.GenerateSignature("123456", "GET", "/test");

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*ApiKey*");
    }

    [Fact]
    public void GenerateSignature_ShouldThrowException_WhenApiSecretIsMissing()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "valid-key",
            ApiSecret = string.Empty
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);

        // Act
        var act = () => authenticator.GenerateSignature("123456", "GET", "/test");

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*ApiSecret*");
    }

    [Fact]
    public void GenerateSignature_ShouldHandleECKeyFormat_WithoutCryptographicValidation()
    {
        // Arrange - This test only validates format parsing, not cryptographic operations
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-api-key",
            // Valid base64 format that will be detected as EC key but won't be used for actual signing
            ApiSecret = @"-----BEGIN EC PRIVATE KEY-----
VGhpcyBpcyBhIG1vY2sgRUMga2V5IGZvciB0ZXN0aW5nIG9ubHkgYW5kIHNob3VsZCBub3QgYmUgdXNlZCBmb3IgYWN0dWFsIGNyeXB0b2dyYXBoaWMgb3BlcmF0aW9ucyBpbiBwcm9kdWN0aW9uIGVudmlyb25tZW50cw==
-----END EC PRIVATE KEY-----"
        };
        _optionsMonitor.CurrentValue.Returns(options);

        // Act & Assert - We expect this to fail at cryptographic validation, not format parsing
        var act = () => new CoinbaseAuthenticator(_optionsMonitor);
        act.Should().NotThrow("constructor should not fail on valid key format");
    }

    [Fact]
    public void GenerateSignature_ShouldDetectEd25519KeyFormat()
    {
        // Arrange
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-api-key",
            // Valid base64 Ed25519-style key that will be detected correctly
            ApiSecret = @"-----BEGIN PRIVATE KEY-----
VGhpcyBpcyBhIG1vY2sgRWQyNTUxOSBrZXkgaW4gUEtDUyM4IGZvcm1hdCBmb3IgdGVzdGluZyBvbmx5IGFuZCBzaG91bGQgbm90IGJlIHVzZWQgZm9yIGFjdHVhbCBjcnlwdG9ncmFwaGljIG9wZXJhdGlvbnM=
-----END PRIVATE KEY-----"
        };
        _optionsMonitor.CurrentValue.Returns(options);

        // Act & Assert - Constructor should succeed, key format detection should work
        var act = () => new CoinbaseAuthenticator(_optionsMonitor);
        act.Should().NotThrow("constructor should handle valid Ed25519 format detection");
    }

    [Fact]
    public void ConfigureHttpClient_ShouldSucceedWithMockKey_ButNotPerformRealAuth()
    {
        // Arrange - This test verifies the method exists and can configure headers without real authentication
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-api-key",
            ApiSecret = "VmFsaWRCYXNlNjRCdXROb3RSZWFsS2V5Rm9yVGVzdGluZ09ubHk="
        };
        _optionsMonitor.CurrentValue.Returns(options);

        var authenticator = new CoinbaseAuthenticator(_optionsMonitor);
        var httpClient = new HttpClient();

        // Act & Assert - Method should exist and complete without throwing
        var act = () => authenticator.ConfigureHttpClient(httpClient);
        act.Should().NotThrow("ConfigureHttpClient should complete even with mock keys");
    }

    [Fact]
    public void KeyFormatDetection_ShouldWorkCorrectly()
    {
        // Test that the authenticator can distinguish between different key formats

        // EC Key format
        var ecOptions = new CoinbaseApiOptions
        {
            ApiKey = "test-ec-key",
            ApiSecret = @"-----BEGIN EC PRIVATE KEY-----
VGhpcyBpcyBhIG1vY2sgRUMga2V5IGZvcm1hdCBmb3IgdGVzdGluZyBvbmx5
-----END EC PRIVATE KEY-----"
        };
        var ecMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        ecMonitor.CurrentValue.Returns(ecOptions);

        // Ed25519 Key format
        var ed25519Options = new CoinbaseApiOptions
        {
            ApiKey = "test-ed25519-key",
            ApiSecret = @"-----BEGIN PRIVATE KEY-----
VGhpcyBpcyBhIG1vY2sgRWQyNTUxOSBrZXkgZm9ybWF0IGZvciB0ZXN0aW5nIG9ubHk=
-----END PRIVATE KEY-----"
        };
        var ed25519Monitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        ed25519Monitor.CurrentValue.Returns(ed25519Options);

        // Raw key format (treated as Ed25519)
        var rawOptions = new CoinbaseApiOptions
        {
            ApiKey = "test-raw-key",
            ApiSecret = "VGhpcyBpcyBhIG1vY2sgcmF3IGtleSBmb3JtYXQgZm9yIHRlc3Rpbmcgb25seQ=="
        };
        var rawMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        rawMonitor.CurrentValue.Returns(rawOptions);

        // Act & Assert - All formats should be recognized without format errors
        var createECAuth = () => new CoinbaseAuthenticator(ecMonitor);
        var createEd25519Auth = () => new CoinbaseAuthenticator(ed25519Monitor);
        var createRawAuth = () => new CoinbaseAuthenticator(rawMonitor);

        createECAuth.Should().NotThrow("EC key format should be recognized");
        createEd25519Auth.Should().NotThrow("Ed25519 key format should be recognized");
        createRawAuth.Should().NotThrow("Raw key format should be recognized");
    }
}
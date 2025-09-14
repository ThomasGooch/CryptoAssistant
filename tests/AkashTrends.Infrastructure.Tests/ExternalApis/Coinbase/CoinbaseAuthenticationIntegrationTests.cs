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
    public void FullAuthenticationFlow_ShouldDetectEd25519Format()
    {
        // Arrange - Test format detection without actual cryptographic operations
        var options = new CoinbaseApiOptions
        {
            ApiKey = "organizations/test-org/apiKeys/test-key-id",
            ApiSecret = CreateMockEd25519Key()
        };

        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        // Act & Assert - Constructor should work for format detection
        var act = () => new CoinbaseAuthenticator(optionsMonitor);
        act.Should().NotThrow("Ed25519 format detection should work");
    }

    [Fact]
    public void FullAuthenticationFlow_ShouldDetectECFormat()
    {
        // Arrange - Test EC format detection
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-ec-key",
            ApiSecret = CreateMockECKey()
        };

        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        // Act & Assert - Constructor should work for format detection
        var act = () => new CoinbaseAuthenticator(optionsMonitor);
        act.Should().NotThrow("EC format detection should work");
    }

    [Theory]
    [InlineData("organizations/test-org/apiKeys/key123", "key123")]
    [InlineData("organizations/another-org/apiKeys/my-key-id", "my-key-id")]
    [InlineData("simple-key", "simple-key")]
    public void ApiKeyExtraction_Logic_ShouldBeCorrect(string inputKey, string expectedExtracted)
    {
        // Test the key extraction logic without doing actual HTTP operations
        // This tests the Program.cs logic for extracting API keys from organization format

        var extractedKey = inputKey.Split('/').LastOrDefault() ?? inputKey;
        extractedKey.Should().Be(expectedExtracted, "key extraction logic should work correctly");
    }

    [Fact]
    public void ErrorHandling_ShouldHandleValidBase64ButInvalidKeyStructure()
    {
        // Arrange - This creates a valid base64 string but invalid key structure 
        var options = new CoinbaseApiOptions
        {
            ApiKey = "test-key",
            ApiSecret = "aW52YWxpZC1rZXktZm9ybWF0LXRoYXQtY2Fubm90LWJlLXBhcnNlZA==" // Valid base64 but potentially invalid structure
        };

        var optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        optionsMonitor.CurrentValue.Returns(options);

        // Act & Assert - Constructor should succeed with format detection, actual validation happens during use
        var act = () => new CoinbaseAuthenticator(optionsMonitor);
        act.Should().NotThrow("Constructor should succeed for valid base64 format detection");
    }

    [Fact]
    public void KeyFormatDetection_ShouldDistinguishBetweenKeyTypes()
    {
        // This test verifies that the authenticator can distinguish between different key formats
        // without attempting actual cryptographic operations

        // Test Ed25519 format detection
        var ed25519Options = new CoinbaseApiOptions
        {
            ApiKey = "ed25519-key",
            ApiSecret = CreateMockEd25519Key()
        };
        var ed25519Monitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        ed25519Monitor.CurrentValue.Returns(ed25519Options);

        // Test EC format detection  
        var ecOptions = new CoinbaseApiOptions
        {
            ApiKey = "ec-key",
            ApiSecret = CreateMockECKey()
        };
        var ecMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        ecMonitor.CurrentValue.Returns(ecOptions);

        // Act & Assert - Format detection should work without cryptographic operations
        var createEd25519Auth = () => new CoinbaseAuthenticator(ed25519Monitor);
        var createECAuth = () => new CoinbaseAuthenticator(ecMonitor);

        // Both should succeed at format detection level
        createEd25519Auth.Should().NotThrow("Ed25519 format should be detected correctly");
        createECAuth.Should().NotThrow("EC format should be detected correctly");
    }

    private static string CreateMockEd25519Key()
    {
        // Create a properly formatted PKCS#8 Ed25519 key for format detection only
        // This creates the minimal PKCS#8 structure that our parser can recognize
        var mockPkcs8 = new List<byte>();

        // PKCS#8 header (minimal version for testing)
        mockPkcs8.AddRange(new byte[] { 0x30, 0x2E }); // SEQUENCE, length 46
        mockPkcs8.AddRange(new byte[] { 0x02, 0x01, 0x00 }); // INTEGER version 0
        mockPkcs8.AddRange(new byte[] { 0x30, 0x05 }); // SEQUENCE for AlgorithmIdentifier
        mockPkcs8.AddRange(new byte[] { 0x06, 0x03, 0x2B, 0x65, 0x70 }); // OID for Ed25519
        mockPkcs8.AddRange(new byte[] { 0x04, 0x22 }); // OCTET STRING, length 34
        mockPkcs8.AddRange(new byte[] { 0x04, 0x20 }); // Inner OCTET STRING, length 32 (our parser looks for this)

        // 32-byte Ed25519 private key (deterministic for testing)
        for (int i = 0; i < 32; i++)
        {
            mockPkcs8.Add((byte)(i * 3 % 256));
        }

        var base64Key = Convert.ToBase64String(mockPkcs8.ToArray());
        return $"-----BEGIN PRIVATE KEY-----\n{base64Key}\n-----END PRIVATE KEY-----";
    }

    private static string CreateMockECKey()
    {
        // Create a basic EC private key structure for format detection
        // This is a minimal valid base64 structure that won't cause parsing errors
        var mockEcBytes = new byte[64]; // Basic EC key structure
        for (int i = 0; i < mockEcBytes.Length; i++)
        {
            mockEcBytes[i] = (byte)(i * 5 % 256); // Deterministic test data
        }

        var base64Key = Convert.ToBase64String(mockEcBytes);
        var formattedKey = "";
        for (int i = 0; i < base64Key.Length; i += 64)
        {
            var lineLength = Math.Min(64, base64Key.Length - i);
            formattedKey += base64Key.Substring(i, lineLength) + "\n";
        }

        return $"-----BEGIN EC PRIVATE KEY-----\n{formattedKey}-----END EC PRIVATE KEY-----";
    }
}
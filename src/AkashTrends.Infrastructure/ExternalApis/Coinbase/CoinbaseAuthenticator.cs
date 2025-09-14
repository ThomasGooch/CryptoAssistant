using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using NSec.Cryptography;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class CoinbaseAuthenticator : ICoinbaseAuthenticator
{
    private readonly CoinbaseApiOptions _options;

    public CoinbaseAuthenticator(IOptionsMonitor<CoinbaseApiOptions> options)
    {
        _options = options.CurrentValue;
        ValidateCredentials();
    }

    public void ConfigureHttpClient(HttpClient client)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        
        client.DefaultRequestHeaders.Add("CB-ACCESS-KEY", _options.ApiKey);
        client.DefaultRequestHeaders.Add("CB-ACCESS-SIGN", GenerateSignature(timestamp, "GET", "/"));
        client.DefaultRequestHeaders.Add("CB-ACCESS-TIMESTAMP", timestamp);
    }

    public string GenerateSignature(string timestamp, string method, string path)
    {
        var message = $"{timestamp}{method}{path}";

        try
        {
            var messageBytes = System.Text.Encoding.UTF8.GetBytes(message);
            
            // Check if this is an Ed25519 key
            if (_options.ApiSecret.Contains("-----BEGIN PRIVATE KEY-----") || 
                (!_options.ApiSecret.Contains("-----BEGIN EC PRIVATE KEY-----") && !_options.ApiSecret.Contains("-----END")))
            {
                // Handle Ed25519 key format
                return GenerateEd25519Signature(messageBytes);
            }
            else
            {
                // Handle EC key format (original logic)
                return GenerateECSignature(messageBytes);
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Failed to generate signature. Invalid private key format.", ex);
        }
    }

    private string GenerateEd25519Signature(byte[] messageBytes)
    {
        // Parse Ed25519 private key
        var privateKeyText = _options.ApiSecret
            .Replace("-----BEGIN PRIVATE KEY-----", "")
            .Replace("-----END PRIVATE KEY-----", "")
            .Replace("\n", "")
            .Replace("\r", "");

        var pkcs8Bytes = Convert.FromBase64String(privateKeyText);

        try
        {
            // Extract the raw Ed25519 private key from PKCS#8 format
            var rawPrivateKey = ExtractEd25519PrivateKeyFromPkcs8(pkcs8Bytes);
            
            // Use NSec to handle Ed25519 signatures
            var signatureAlgorithm = SignatureAlgorithm.Ed25519;
            var key = Key.Import(signatureAlgorithm, rawPrivateKey, KeyBlobFormat.RawPrivateKey);
            
            // Sign the message
            var signature = signatureAlgorithm.Sign(key, messageBytes);
            
            return Convert.ToBase64String(signature);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to sign with Ed25519 key: {ex.Message}", ex);
        }
    }

    private static byte[] ExtractEd25519PrivateKeyFromPkcs8(byte[] pkcs8Bytes)
    {
        // PKCS#8 Ed25519 private key structure:
        // SEQUENCE {
        //   version       INTEGER { v1(0) }
        //   algorithm     AlgorithmIdentifier { Ed25519 }
        //   privateKey    OCTET STRING (containing another OCTET STRING with 32-byte key)
        // }
        
        try
        {
            // Simple parsing - find the 32-byte Ed25519 private key
            // Ed25519 private keys are exactly 32 bytes and typically located near the end
            
            // Look for the pattern: 04 20 (OCTET STRING of length 32) followed by 32 bytes
            for (int i = 0; i < pkcs8Bytes.Length - 34; i++)
            {
                if (pkcs8Bytes[i] == 0x04 && pkcs8Bytes[i + 1] == 0x20)
                {
                    // Found OCTET STRING of length 32 - extract the 32 bytes
                    var privateKey = new byte[32];
                    Array.Copy(pkcs8Bytes, i + 2, privateKey, 0, 32);
                    return privateKey;
                }
            }
            
            // Fallback: try the last 32 bytes (common location)
            if (pkcs8Bytes.Length >= 32)
            {
                var privateKey = new byte[32];
                Array.Copy(pkcs8Bytes, pkcs8Bytes.Length - 32, privateKey, 0, 32);
                return privateKey;
            }
            
            throw new InvalidOperationException("Could not extract Ed25519 private key from PKCS#8 format");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to parse PKCS#8 Ed25519 private key: {ex.Message}", ex);
        }
    }

    private string GenerateECSignature(byte[] messageBytes)
    {
        // Parse EC private key (original logic)
        var privateKeyText = _options.ApiSecret
            .Replace("-----BEGIN EC PRIVATE KEY-----", "")
            .Replace("-----END EC PRIVATE KEY-----", "")
            .Replace("\n", "")
            .Replace("\r", "");

        var keyBytes = Convert.FromBase64String(privateKeyText);

        using var ecdsa = ECDsa.Create();
        ecdsa.ImportECPrivateKey(keyBytes, out _);

        var signatureBytes = ecdsa.SignData(messageBytes, HashAlgorithmName.SHA256);
        return Convert.ToBase64String(signatureBytes);
    }

    private void ValidateCredentials()
    {
        var missingCredentials = new List<string>();

        if (string.IsNullOrEmpty(_options.ApiKey))
            missingCredentials.Add("ApiKey");
        if (string.IsNullOrEmpty(_options.ApiSecret))
            missingCredentials.Add("ApiSecret");

        if (missingCredentials.Any())
        {
            throw new InvalidOperationException(
                $"Missing required Coinbase API credentials: {string.Join(", ", missingCredentials)}. " +
                "Please set them in your configuration or environment variables.");
        }
    }
}

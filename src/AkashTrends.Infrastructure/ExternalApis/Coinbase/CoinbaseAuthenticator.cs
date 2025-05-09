using Microsoft.Extensions.Options;
using System.Security.Cryptography;

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
            // Parse the PEM private key
            var privateKeyText = _options.ApiSecret
                .Replace("-----BEGIN EC PRIVATE KEY-----", "")
                .Replace("-----END EC PRIVATE KEY-----", "")
                .Replace("\n", "");

            var keyBytes = Convert.FromBase64String(privateKeyText);

            using var ecdsa = ECDsa.Create();
            ecdsa.ImportECPrivateKey(keyBytes, out _);

            var messageBytes = System.Text.Encoding.UTF8.GetBytes(message);
            var signatureBytes = ecdsa.SignData(messageBytes, HashAlgorithmName.SHA256);
            
            return Convert.ToBase64String(signatureBytes);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Failed to generate signature. Invalid private key format.", ex);
        }
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

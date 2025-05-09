using System.Net.Http;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public interface ICoinbaseAuthenticator
{
    void ConfigureHttpClient(HttpClient client);
    string GenerateSignature(string timestamp, string method, string path);
}

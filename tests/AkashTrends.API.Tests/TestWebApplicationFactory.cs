using AkashTrends.API;
using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AkashTrends.API.Tests;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Add test configuration with dummy Coinbase credentials
            var testConfiguration = new Dictionary<string, string>
            {
                ["CoinbaseApi:BaseUrl"] = "https://api.coinbase.com",
                ["CoinbaseApi:ApiKey"] = "test-api-key",
                ["CoinbaseApi:ApiSecret"] = "dGVzdC1hcGktc2VjcmV0LWZvci10ZXN0aW5nLW9ubHk="
            };

            config.AddInMemoryCollection(testConfiguration!);
        });
    }
}
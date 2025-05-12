using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Cache;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.Cache;
using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using AkashTrends.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AkashTrends.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<CoinbaseApiOptions>(
            configuration.GetSection("CoinbaseApi"));

        services.AddHttpClient<ICoinbaseApiClient, CoinbaseClient>();
        services.AddSingleton<ICoinbaseAuthenticator, CoinbaseAuthenticator>();
        
        // Register exchange service with caching decorator
        services.AddSingleton<CoinbaseExchangeService>();
        services.AddSingleton<ICryptoExchangeService>(sp =>
        {
            var exchangeService = sp.GetRequiredService<CoinbaseExchangeService>();
            var cacheService = sp.GetRequiredService<ICacheService>();
            var timeProvider = sp.GetRequiredService<TimeProvider>();
            return new CachedCryptoExchangeService(exchangeService, cacheService, timeProvider);
        });

        // Add caching services
        services.AddMemoryCache();
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<ICacheService, CacheService>();

        return services;
    }
}

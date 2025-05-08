using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Services;
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

        services.AddHttpClient();
        services.AddSingleton<ICoinbaseApiClient, CoinbaseClient>();
        services.AddSingleton<ICryptoExchangeService, CoinbaseExchangeService>();
        services.AddSingleton<IIndicatorFactory, IndicatorFactory>();

        return services;
    }
}

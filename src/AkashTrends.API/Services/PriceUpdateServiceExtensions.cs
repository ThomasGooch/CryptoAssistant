using AkashTrends.Core.Services;
using Microsoft.Extensions.DependencyInjection;

namespace AkashTrends.API.Services;

public static class PriceUpdateServiceExtensions
{
    public static IServiceCollection AddRealTimeServices(this IServiceCollection services)
    {
        services.AddSingleton<IIndicatorUpdateService, IndicatorUpdateService>();
        services.AddHostedService<PriceUpdateService>();

        return services;
    }
}

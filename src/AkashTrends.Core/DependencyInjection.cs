using AkashTrends.Core.Analysis.Indicators;
using Microsoft.Extensions.DependencyInjection;

namespace AkashTrends.Core;

public static class DependencyInjection
{
    public static IServiceCollection AddCoreServices(this IServiceCollection services)
    {
        services.AddSingleton<IIndicatorFactory, IndicatorFactory>();
        return services;
    }
}

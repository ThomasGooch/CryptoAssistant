using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Analysis.MultiTimeframe;
using Microsoft.Extensions.DependencyInjection;

namespace AkashTrends.Core;

public static class DependencyInjection
{
    public static IServiceCollection AddCoreServices(this IServiceCollection services)
    {
        services.AddSingleton<IIndicatorFactory, IndicatorFactory>();
        services.AddTransient<ITimeframeConverter, TimeframeConverter>();
        services.AddTransient<IMultiTimeframeIndicatorService, MultiTimeframeIndicatorService>();
        return services;
    }
}

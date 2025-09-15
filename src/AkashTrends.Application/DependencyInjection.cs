using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.CalculateIndicator;
using AkashTrends.Application.Features.Crypto.GetAvailableIndicators;
using AkashTrends.Application.Features.Crypto.GetCurrentPrice;
using AkashTrends.Application.Features.Crypto.GetHistoricalPrices;
using AkashTrends.Application.Features.Preferences.GetUserPreferences;
using AkashTrends.Application.Features.Preferences.SaveUserPreferences;
using Microsoft.Extensions.DependencyInjection;

namespace AkashTrends.Application;

/// <summary>
/// Extension methods for setting up application services in an IServiceCollection
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds application services to the service collection
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <returns>The service collection with application services added</returns>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register CQRS infrastructure
        services.AddTransient<IQueryDispatcher, QueryDispatcher>();
        // Register query handlers
        services.AddTransient<IQueryHandler<GetAvailableIndicatorsQuery, GetAvailableIndicatorsResult>, GetAvailableIndicatorsQueryHandler>();
        services.AddTransient<IQueryHandler<GetCurrentPriceQuery, GetCurrentPriceResult>, GetCurrentPriceQueryHandler>();
        services.AddTransient<IQueryHandler<GetHistoricalPricesQuery, GetHistoricalPricesResult>, GetHistoricalPricesQueryHandler>();
        services.AddTransient<IQueryHandler<CalculateIndicatorQuery, CalculateIndicatorResult>, CalculateIndicatorQueryHandler>();

        // Register preferences handlers
        services.AddTransient<IQueryHandler<GetUserPreferencesQuery, GetUserPreferencesResult>, GetUserPreferencesQueryHandler>();
        services.AddTransient<IQueryHandler<SaveUserPreferencesCommand, SaveUserPreferencesResult>, SaveUserPreferencesCommandHandler>();


        return services;
    }
}

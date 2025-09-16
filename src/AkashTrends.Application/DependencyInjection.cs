using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Alerts.CreateAlert;
using AkashTrends.Application.Features.Alerts.DeleteAlert;
using AkashTrends.Application.Features.Alerts.GetUserAlerts;
using AkashTrends.Application.Features.Alerts.UpdateAlert;
using AkashTrends.Application.Features.Crypto.CalculateIndicator;
using AkashTrends.Application.Features.Crypto.GetAvailableIndicators;
using AkashTrends.Application.Features.Crypto.GetCurrentPrice;
using AkashTrends.Application.Features.Crypto.GetHistoricalPrices;
using AkashTrends.Application.Features.Crypto.CalculateMultiTimeframeIndicators;
using AkashTrends.Application.Features.Crypto.GetHistoricalCandlestickData;
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
        services.AddTransient<IQueryHandler<GetHistoricalCandlestickDataQuery, GetHistoricalCandlestickDataResult>, GetHistoricalCandlestickDataQueryHandler>();
        services.AddTransient<IQueryHandler<CalculateMultiTimeframeIndicatorsQuery, CalculateMultiTimeframeIndicatorsResult>, CalculateMultiTimeframeIndicatorsQueryHandler>();

        // Register preferences handlers
        services.AddTransient<IQueryHandler<GetUserPreferencesQuery, GetUserPreferencesResult>, GetUserPreferencesQueryHandler>();
        services.AddTransient<IQueryHandler<SaveUserPreferencesCommand, SaveUserPreferencesResult>, SaveUserPreferencesCommandHandler>();

        // Register alert handlers
        services.AddTransient<IQueryHandler<CreateAlertCommand, CreateAlertResult>, CreateAlertCommandHandler>();
        services.AddTransient<IQueryHandler<DeleteAlertCommand, DeleteAlertResult>, DeleteAlertCommandHandler>();
        services.AddTransient<IQueryHandler<GetUserAlertsQuery, GetUserAlertsResult>, GetUserAlertsQueryHandler>();
        services.AddTransient<IQueryHandler<UpdateAlertCommand, UpdateAlertResult>, UpdateAlertCommandHandler>();

        return services;
    }
}

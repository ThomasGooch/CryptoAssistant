using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Infrastructure.Services;

public class AlertMonitoringService : IAlertMonitoringService
{
    private readonly ILogger<AlertMonitoringService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private volatile bool _isMonitoring = false;

    public AlertMonitoringService(ILogger<AlertMonitoringService> logger, IServiceProvider serviceProvider)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
    }

    public bool IsMonitoring => _isMonitoring;

    public event EventHandler<AlertTriggeredEventArgs>? AlertTriggered;

    public Task StartMonitoringAsync()
    {
        _logger.LogInformation("Starting alert monitoring service");
        _isMonitoring = true;
        _logger.LogInformation("Alert monitoring service started");
        return Task.CompletedTask;
    }

    public Task StopMonitoringAsync()
    {
        _logger.LogInformation("Stopping alert monitoring service");
        _isMonitoring = false;
        _logger.LogInformation("Alert monitoring service stopped");
        return Task.CompletedTask;
    }

    public async Task CheckAlertsForPriceUpdateAsync(string symbol, decimal currentPrice)
    {
        if (string.IsNullOrWhiteSpace(symbol))
            throw new ArgumentException("Symbol cannot be empty or null", nameof(symbol));

        if (currentPrice <= 0)
            throw new ArgumentException("Price must be greater than 0", nameof(currentPrice));

        if (!_isMonitoring)
        {
            _logger.LogDebug("Alert monitoring is not active, skipping price check for {Symbol}", symbol);
            return;
        }

        try
        {
            _logger.LogDebug("Checking alerts for {Symbol} at price {Price}", symbol, currentPrice);

            using var scope = _serviceProvider.CreateScope();
            var alertService = scope.ServiceProvider.GetRequiredService<IAlertService>();

            var activeAlerts = await alertService.GetActiveAlertsForSymbolAsync(symbol);

            if (!activeAlerts.Any())
            {
                _logger.LogDebug("No active alerts found for symbol {Symbol}", symbol);
                return;
            }

            var triggeredAlerts = new List<Alert>();

            foreach (var alert in activeAlerts)
            {
                if (alert.ShouldTrigger(currentPrice))
                {
                    try
                    {
                        alert.Trigger(currentPrice);
                        await alertService.UpdateAlertAsync(alert);

                        triggeredAlerts.Add(alert);

                        _logger.LogInformation("Alert {AlertId} triggered for user {UserId} - {Symbol} {Condition} {Threshold} (current: {CurrentPrice})",
                            alert.Id, alert.UserId, alert.Symbol, alert.Condition, alert.Threshold, currentPrice);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to trigger alert {AlertId}", alert.Id);
                    }
                }
            }

            // Fire events for all triggered alerts
            foreach (var alert in triggeredAlerts)
            {
                try
                {
                    var eventArgs = new AlertTriggeredEventArgs(alert, currentPrice, DateTimeOffset.UtcNow);
                    AlertTriggered?.Invoke(this, eventArgs);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error firing AlertTriggered event for alert {AlertId}", alert.Id);
                }
            }

            if (triggeredAlerts.Any())
            {
                _logger.LogInformation("Triggered {Count} alerts for symbol {Symbol} at price {Price}",
                    triggeredAlerts.Count, symbol, currentPrice);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking alerts for symbol {Symbol} at price {Price}", symbol, currentPrice);
            // Don't re-throw to prevent disrupting price update flow
        }
    }
}
using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Services;

public interface IAlertMonitoringService
{
    Task StartMonitoringAsync();
    Task StopMonitoringAsync();
    Task CheckAlertsForPriceUpdateAsync(string symbol, decimal currentPrice);
    bool IsMonitoring { get; }
    event EventHandler<AlertTriggeredEventArgs>? AlertTriggered;
}

public class AlertTriggeredEventArgs : EventArgs
{
    public Alert Alert { get; }
    public decimal TriggerPrice { get; }
    public DateTimeOffset TriggerTime { get; }

    public AlertTriggeredEventArgs(Alert alert, decimal triggerPrice, DateTimeOffset triggerTime)
    {
        Alert = alert ?? throw new ArgumentNullException(nameof(alert));
        TriggerPrice = triggerPrice;
        TriggerTime = triggerTime;
    }
}
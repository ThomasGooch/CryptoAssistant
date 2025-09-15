using AkashTrends.API.Hubs;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace AkashTrends.API.Services;

public class AlertNotificationService
{
    private readonly IHubContext<PriceUpdateHub> _hubContext;
    private readonly ILogger<AlertNotificationService> _logger;

    public AlertNotificationService(
        IHubContext<PriceUpdateHub> hubContext,
        ILogger<AlertNotificationService> logger)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task SendAlertNotificationAsync(AlertTriggeredEventArgs eventArgs)
    {
        try
        {
            var alert = eventArgs.Alert;
            _logger.LogInformation("Sending alert notification for alert {AlertId} to user {UserId}",
                alert.Id, alert.UserId);

            var notification = new
            {
                AlertId = alert.Id,
                UserId = alert.UserId,
                Symbol = alert.Symbol,
                Title = alert.Title,
                Message = alert.Message,
                Threshold = alert.Threshold,
                Condition = alert.Condition.ToString(),
                TriggerPrice = eventArgs.TriggerPrice,
                TriggerTime = eventArgs.TriggerTime,
                Type = "alert_triggered"
            };

            // Send to specific user group
            await _hubContext.Clients.Group($"user_{alert.UserId}")
                .SendAsync("ReceiveAlertNotification", notification);

            _logger.LogDebug("Alert notification sent for alert {AlertId}", alert.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send alert notification for alert {AlertId}",
                eventArgs.Alert.Id);
        }
    }
}
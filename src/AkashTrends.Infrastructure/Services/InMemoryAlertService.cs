using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace AkashTrends.Infrastructure.Services;

public class InMemoryAlertService : IAlertService
{
    private readonly ILogger<InMemoryAlertService> _logger;
    private readonly ConcurrentDictionary<Guid, Alert> _alerts;

    public InMemoryAlertService(ILogger<InMemoryAlertService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _alerts = new ConcurrentDictionary<Guid, Alert>();
    }

    public Task<Alert> CreateAlertAsync(string userId, string symbol, decimal threshold, AlertCondition condition, string title, string message)
    {
        _logger.LogInformation("Creating alert for user {UserId} for symbol {Symbol} with threshold {Threshold}",
            userId, symbol, threshold);

        var alert = Alert.Create(userId, symbol, threshold, condition, title, message);
        _alerts.TryAdd(alert.Id, alert);

        _logger.LogInformation("Created alert {AlertId} for user {UserId}", alert.Id, userId);

        return Task.FromResult(alert);
    }

    public Task<Alert?> GetAlertAsync(Guid alertId)
    {
        _logger.LogDebug("Getting alert {AlertId}", alertId);

        _alerts.TryGetValue(alertId, out var alert);
        return Task.FromResult(alert);
    }

    public Task<IReadOnlyList<Alert>> GetUserAlertsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Getting alerts for user {UserId}", userId);

        var userAlerts = _alerts.Values
            .Where(a => a.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(a => a.CreatedAt)
            .ToList();

        return Task.FromResult<IReadOnlyList<Alert>>(userAlerts);
    }

    public Task<IReadOnlyList<Alert>> GetActiveUserAlertsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Getting active alerts for user {UserId}", userId);

        var activeAlerts = _alerts.Values
            .Where(a => a.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase) &&
                       a.IsActive && !a.IsTriggered)
            .OrderByDescending(a => a.CreatedAt)
            .ToList();

        return Task.FromResult<IReadOnlyList<Alert>>(activeAlerts);
    }

    public Task<IReadOnlyList<Alert>> GetTriggeredUserAlertsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Getting triggered alerts for user {UserId}", userId);

        var triggeredAlerts = _alerts.Values
            .Where(a => a.UserId.Equals(userId, StringComparison.OrdinalIgnoreCase) &&
                       a.IsTriggered)
            .OrderByDescending(a => a.TriggeredAt)
            .ToList();

        return Task.FromResult<IReadOnlyList<Alert>>(triggeredAlerts);
    }

    public Task<IReadOnlyList<Alert>> GetActiveAlertsForSymbolAsync(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
            throw new ArgumentException("Symbol cannot be empty or null", nameof(symbol));

        _logger.LogDebug("Getting active alerts for symbol {Symbol}", symbol);

        var symbolAlerts = _alerts.Values
            .Where(a => a.Symbol.Equals(symbol.Trim().ToUpperInvariant(), StringComparison.OrdinalIgnoreCase) &&
                       a.IsActive && !a.IsTriggered)
            .OrderBy(a => a.Threshold)
            .ToList();

        return Task.FromResult<IReadOnlyList<Alert>>(symbolAlerts);
    }

    public Task UpdateAlertAsync(Alert alert)
    {
        if (alert == null)
            throw new ArgumentNullException(nameof(alert));

        _logger.LogDebug("Updating alert {AlertId}", alert.Id);

        if (!_alerts.ContainsKey(alert.Id))
            throw new ArgumentException($"Alert not found: {alert.Id}", nameof(alert));

        _alerts[alert.Id] = alert;

        _logger.LogDebug("Updated alert {AlertId}", alert.Id);

        return Task.CompletedTask;
    }

    public Task DeleteAlertAsync(Guid alertId)
    {
        _logger.LogDebug("Deleting alert {AlertId}", alertId);

        _alerts.TryRemove(alertId, out _);

        _logger.LogDebug("Deleted alert {AlertId}", alertId);

        return Task.CompletedTask;
    }

    public Task<bool> AlertExistsAsync(Guid alertId)
    {
        var exists = _alerts.ContainsKey(alertId);
        _logger.LogDebug("Alert {AlertId} exists: {Exists}", alertId, exists);

        return Task.FromResult(exists);
    }
}
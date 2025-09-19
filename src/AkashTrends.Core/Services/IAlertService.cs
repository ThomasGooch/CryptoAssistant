using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Services;

public interface IAlertService
{
    Task<Alert> CreateAlertAsync(string userId, string symbol, decimal threshold, AlertCondition condition, string title, string message, int? cooldownSeconds = null);
    Task<Alert?> GetAlertAsync(Guid alertId);
    Task<IReadOnlyList<Alert>> GetUserAlertsAsync(string userId);
    Task<IReadOnlyList<Alert>> GetActiveUserAlertsAsync(string userId);
    Task<IReadOnlyList<Alert>> GetTriggeredUserAlertsAsync(string userId);
    Task<IReadOnlyList<Alert>> GetActiveAlertsForSymbolAsync(string symbol);
    Task UpdateAlertAsync(Alert alert);
    Task DeleteAlertAsync(Guid alertId);
    Task<bool> AlertExistsAsync(Guid alertId);
}
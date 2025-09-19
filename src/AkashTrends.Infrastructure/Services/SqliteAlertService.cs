using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Infrastructure.Services;

public class SqliteAlertService : IAlertService
{
    private readonly AlertDbContext _context;
    private readonly ILogger<SqliteAlertService> _logger;

    public SqliteAlertService(AlertDbContext context, ILogger<SqliteAlertService> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Alert> CreateAlertAsync(string userId, string symbol, decimal threshold, AlertCondition condition, string title, string message, int? cooldownSeconds = null)
    {
        _logger.LogInformation("Creating alert for user {UserId} for symbol {Symbol} with threshold {Threshold} and cooldown {CooldownSeconds}s",
            userId, symbol, threshold, cooldownSeconds);

        var alert = Alert.Create(userId, symbol, threshold, condition, title, message, cooldownSeconds);

        _context.Alerts.Add(alert);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created alert {AlertId} for user {UserId}", alert.Id, userId);

        return alert;
    }

    public async Task<Alert?> GetAlertAsync(Guid alertId)
    {
        _logger.LogDebug("Getting alert {AlertId}", alertId);

        var alert = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == alertId);
        return alert;
    }

    public async Task<IReadOnlyList<Alert>> GetUserAlertsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Getting alerts for user {UserId}", userId);

        var userAlerts = await _context.Alerts
            .Where(a => a.UserId == userId)
            .ToListAsync();

        // Order on client side due to SQLite DateTimeOffset limitations  
        var orderedAlerts = userAlerts
            .OrderByDescending(a => a.CreatedAt)
            .ToList();

        return orderedAlerts.AsReadOnly();
    }

    public async Task<IReadOnlyList<Alert>> GetActiveUserAlertsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Getting active alerts for user {UserId}", userId);

        var activeAlerts = await _context.Alerts
            .Where(a => a.UserId == userId &&
                       a.IsActive && !a.IsTriggered)
            .ToListAsync();

        // Order on client side due to SQLite DateTimeOffset limitations
        var orderedActiveAlerts = activeAlerts
            .OrderByDescending(a => a.CreatedAt)
            .ToList();

        return orderedActiveAlerts.AsReadOnly();
    }

    public async Task<IReadOnlyList<Alert>> GetTriggeredUserAlertsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Getting triggered alerts for user {UserId}", userId);

        var triggeredAlerts = await _context.Alerts
            .Where(a => a.UserId == userId &&
                       a.IsTriggered)
            .ToListAsync();

        // Order on client side due to SQLite DateTimeOffset limitations
        var orderedTriggeredAlerts = triggeredAlerts
            .OrderByDescending(a => a.TriggeredAt)
            .ToList();

        return orderedTriggeredAlerts.AsReadOnly();
    }

    public async Task<IReadOnlyList<Alert>> GetActiveAlertsForSymbolAsync(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
            throw new ArgumentException("Symbol cannot be empty or null", nameof(symbol));

        _logger.LogDebug("Getting active alerts for symbol {Symbol}", symbol);

        var normalizedSymbol = symbol.Trim().ToUpperInvariant();
        var symbolAlerts = await _context.Alerts
            .Where(a => a.Symbol == normalizedSymbol &&
                       a.IsActive && !a.IsTriggered)
            .ToListAsync();

        // Order on client side due to SQLite decimal limitations
        var orderedSymbolAlerts = symbolAlerts
            .OrderBy(a => a.Threshold)
            .ToList();

        return orderedSymbolAlerts.AsReadOnly();
    }

    public async Task UpdateAlertAsync(Alert alert)
    {
        if (alert == null)
            throw new ArgumentNullException(nameof(alert));

        _logger.LogDebug("Updating alert {AlertId}", alert.Id);

        var existingAlert = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == alert.Id);
        if (existingAlert == null)
            throw new ArgumentException($"Alert not found: {alert.Id}", nameof(alert));

        // Update the existing entity
        _context.Entry(existingAlert).CurrentValues.SetValues(alert);
        await _context.SaveChangesAsync();

        _logger.LogDebug("Updated alert {AlertId}", alert.Id);
    }

    public async Task DeleteAlertAsync(Guid alertId)
    {
        _logger.LogDebug("Deleting alert {AlertId}", alertId);

        var alert = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == alertId);
        if (alert != null)
        {
            _context.Alerts.Remove(alert);
            await _context.SaveChangesAsync();
        }

        _logger.LogDebug("Deleted alert {AlertId}", alertId);
    }

    public async Task<bool> AlertExistsAsync(Guid alertId)
    {
        var exists = await _context.Alerts.AnyAsync(a => a.Id == alertId);
        _logger.LogDebug("Alert {AlertId} exists: {Exists}", alertId, exists);

        return exists;
    }
}
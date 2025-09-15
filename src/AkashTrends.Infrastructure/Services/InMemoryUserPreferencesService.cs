using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace AkashTrends.Infrastructure.Services;

/// <summary>
/// In-memory implementation of user preferences service for demo/testing purposes
/// In production, this would be backed by a database
/// </summary>
public class InMemoryUserPreferencesService : IUserPreferencesService
{
    private readonly ConcurrentDictionary<string, UserPreferences> _preferences;
    private readonly ILogger<InMemoryUserPreferencesService> _logger;

    public InMemoryUserPreferencesService(ILogger<InMemoryUserPreferencesService> logger)
    {
        _preferences = new ConcurrentDictionary<string, UserPreferences>();
        _logger = logger;
    }

    public Task<UserPreferences?> GetUserPreferencesAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Getting user preferences for user: {UserId}", userId);

        _preferences.TryGetValue(userId, out var preferences);
        return Task.FromResult(preferences);
    }

    public Task SaveUserPreferencesAsync(UserPreferences userPreferences)
    {
        if (userPreferences == null)
            throw new ArgumentNullException(nameof(userPreferences));

        _logger.LogDebug("Saving user preferences for user: {UserId}", userPreferences.UserId);

        _preferences.AddOrUpdate(
            userPreferences.UserId,
            userPreferences,
            (key, oldValue) => userPreferences);

        return Task.CompletedTask;
    }

    public Task DeleteUserPreferencesAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Deleting user preferences for user: {UserId}", userId);

        _preferences.TryRemove(userId, out _);
        return Task.CompletedTask;
    }

    public Task<bool> UserPreferencesExistAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        _logger.LogDebug("Checking if user preferences exist for user: {UserId}", userId);

        return Task.FromResult(_preferences.ContainsKey(userId));
    }
}
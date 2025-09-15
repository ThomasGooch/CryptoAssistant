using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Services;

/// <summary>
/// Service for managing user preferences
/// </summary>
public interface IUserPreferencesService
{
    /// <summary>
    /// Get user preferences by user ID
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <returns>User preferences or null if not found</returns>
    Task<UserPreferences?> GetUserPreferencesAsync(string userId);

    /// <summary>
    /// Save or update user preferences
    /// </summary>
    /// <param name="userPreferences">The user preferences to save</param>
    Task SaveUserPreferencesAsync(UserPreferences userPreferences);

    /// <summary>
    /// Delete user preferences
    /// </summary>
    /// <param name="userId">The user ID</param>
    Task DeleteUserPreferencesAsync(string userId);

    /// <summary>
    /// Check if user preferences exist
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <returns>True if preferences exist, false otherwise</returns>
    Task<bool> UserPreferencesExistAsync(string userId);
}
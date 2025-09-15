using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Domain;

namespace AkashTrends.Application.Features.Preferences.SaveUserPreferences;

/// <summary>
/// Command to save user preferences
/// </summary>
public class SaveUserPreferencesCommand : IQuery<SaveUserPreferencesResult>
{
    /// <summary>
    /// The user ID
    /// </summary>
    public required string UserId { get; set; }

    /// <summary>
    /// Chart preferences
    /// </summary>
    public ChartPreferences? Chart { get; set; }

    /// <summary>
    /// Indicator preferences
    /// </summary>
    public List<IndicatorPreference>? Indicators { get; set; }

    /// <summary>
    /// Favorite trading pairs
    /// </summary>
    public List<string>? FavoritePairs { get; set; }

    /// <summary>
    /// UI preferences
    /// </summary>
    public UIPreferences? UI { get; set; }
}

/// <summary>
/// Result of the SaveUserPreferencesCommand
/// </summary>
public class SaveUserPreferencesResult
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The updated user preferences
    /// </summary>
    public UserPreferences? Preferences { get; set; }

    /// <summary>
    /// Error message if operation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
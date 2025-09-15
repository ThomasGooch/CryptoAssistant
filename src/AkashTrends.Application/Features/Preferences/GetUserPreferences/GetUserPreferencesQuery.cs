using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Domain;

namespace AkashTrends.Application.Features.Preferences.GetUserPreferences;

/// <summary>
/// Query to get user preferences
/// </summary>
public class GetUserPreferencesQuery : IQuery<GetUserPreferencesResult>
{
    /// <summary>
    /// The user ID
    /// </summary>
    public required string UserId { get; set; }
}

/// <summary>
/// Result of the GetUserPreferencesQuery
/// </summary>
public class GetUserPreferencesResult
{
    /// <summary>
    /// The user preferences (null if not found)
    /// </summary>
    public UserPreferences? Preferences { get; set; }

    /// <summary>
    /// Whether the user preferences exist
    /// </summary>
    public bool Exists { get; set; }
}
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Application.Features.Preferences.GetUserPreferences;

/// <summary>
/// Handler for GetUserPreferencesQuery
/// </summary>
public class GetUserPreferencesQueryHandler : IGetUserPreferencesQueryHandler
{
    private readonly IUserPreferencesService _userPreferencesService;
    private readonly ILogger<GetUserPreferencesQueryHandler> _logger;

    public GetUserPreferencesQueryHandler(
        IUserPreferencesService userPreferencesService,
        ILogger<GetUserPreferencesQueryHandler> logger)
    {
        _userPreferencesService = userPreferencesService;
        _logger = logger;
    }

    public async Task<GetUserPreferencesResult> Handle(GetUserPreferencesQuery query)
    {
        _logger.LogInformation("Getting user preferences for user: {UserId}", query.UserId);

        var preferences = await _userPreferencesService.GetUserPreferencesAsync(query.UserId);

        _logger.LogInformation("Retrieved user preferences for user: {UserId}, Exists: {Exists}",
            query.UserId, preferences != null);

        return new GetUserPreferencesResult
        {
            Preferences = preferences,
            Exists = preferences != null
        };
    }
}
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Application.Features.Preferences.SaveUserPreferences;

/// <summary>
/// Handler for SaveUserPreferencesCommand
/// </summary>
public class SaveUserPreferencesCommandHandler : ISaveUserPreferencesCommandHandler
{
    private readonly IUserPreferencesService _userPreferencesService;
    private readonly ILogger<SaveUserPreferencesCommandHandler> _logger;

    public SaveUserPreferencesCommandHandler(
        IUserPreferencesService userPreferencesService,
        ILogger<SaveUserPreferencesCommandHandler> logger)
    {
        _userPreferencesService = userPreferencesService;
        _logger = logger;
    }

    public async Task<SaveUserPreferencesResult> Handle(SaveUserPreferencesCommand command)
    {
        try
        {
            _logger.LogInformation("Saving user preferences for user: {UserId}", command.UserId);

            // Get existing preferences or create new ones
            var preferences = await _userPreferencesService.GetUserPreferencesAsync(command.UserId)
                             ?? UserPreferences.Create(command.UserId);

            // Update preferences based on what's provided in the command
            if (command.Chart != null)
            {
                preferences.UpdateChartPreferences(command.Chart);
            }

            if (command.Indicators != null)
            {
                preferences.UpdateIndicators(command.Indicators);
            }

            if (command.FavoritePairs != null)
            {
                preferences.UpdateFavoritePairs(command.FavoritePairs);
            }

            if (command.UI != null)
            {
                preferences.UpdateUIPreferences(command.UI);
            }

            // Save the updated preferences
            await _userPreferencesService.SaveUserPreferencesAsync(preferences);

            _logger.LogInformation("Successfully saved user preferences for user: {UserId}", command.UserId);

            return new SaveUserPreferencesResult
            {
                Success = true,
                Preferences = preferences
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save user preferences for user: {UserId}", command.UserId);

            return new SaveUserPreferencesResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }
}
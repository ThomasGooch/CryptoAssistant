using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Preferences.GetUserPreferences;
using AkashTrends.Application.Features.Preferences.SaveUserPreferences;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;

namespace AkashTrends.API.Controllers;

/// <summary>
/// User preferences management endpoints
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class PreferencesController : ControllerBase
{
    private readonly IQueryDispatcher _queryDispatcher;
    private readonly ILogger<PreferencesController> _logger;

    public PreferencesController(
        IQueryDispatcher queryDispatcher,
        ILogger<PreferencesController> logger)
    {
        _queryDispatcher = queryDispatcher;
        _logger = logger;
    }

    /// <summary>
    /// Get user preferences by user ID
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <returns>User preferences</returns>
    /// <response code="200">Returns the user preferences</response>
    /// <response code="400">Invalid user ID provided</response>
    /// <response code="404">User preferences not found</response>
    [HttpGet("{userId}")]
    [ProducesResponseType(typeof(UserPreferencesResponse), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<UserPreferencesResponse>> GetUserPreferences([Required] string userId)
    {
        _logger.LogInformation("Getting preferences for user: {UserId}", userId);

        var query = new GetUserPreferencesQuery { UserId = userId };
        var result = await _queryDispatcher.Dispatch<GetUserPreferencesQuery, GetUserPreferencesResult>(query);

        if (!result.Exists || result.Preferences == null)
        {
            _logger.LogInformation("Preferences not found for user: {UserId}", userId);
            return NotFound($"Preferences not found for user: {userId}");
        }

        _logger.LogInformation("Retrieved preferences for user: {UserId}", userId);

        var response = new UserPreferencesResponse
        {
            UserId = result.Preferences.UserId,
            Chart = ChartPreferencesDto.FromChartPreferences(result.Preferences.Chart),
            Indicators = result.Preferences.Indicators.Select(IndicatorPreferenceDto.FromIndicatorPreference).ToList(),
            FavoritePairs = new List<string>(result.Preferences.FavoritePairs),
            UI = UIPreferencesDto.FromUIPreferences(result.Preferences.UI),
            LastUpdated = result.Preferences.LastUpdated
        };

        return Ok(response);
    }

    /// <summary>
    /// Save or update user preferences
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="request">The preferences to save</param>
    /// <returns>Updated user preferences</returns>
    /// <response code="200">Returns the updated user preferences</response>
    /// <response code="400">Invalid request data</response>
    [HttpPut("{userId}")]
    [ProducesResponseType(typeof(UserPreferencesResponse), 200)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<UserPreferencesResponse>> SaveUserPreferences(
        [Required] string userId,
        [FromBody] UserPreferencesRequest request)
    {
        _logger.LogInformation("Saving preferences for user: {UserId}", userId);

        var command = new SaveUserPreferencesCommand
        {
            UserId = userId,
            Chart = request.Chart?.ToChartPreferences(),
            Indicators = request.Indicators?.Select(i => i.ToIndicatorPreference()).ToList(),
            FavoritePairs = request.FavoritePairs,
            UI = request.UI?.ToUIPreferences()
        };

        var result = await _queryDispatcher.Dispatch<SaveUserPreferencesCommand, SaveUserPreferencesResult>(command);

        if (!result.Success)
        {
            _logger.LogError("Failed to save preferences for user: {UserId}, Error: {Error}", userId, result.ErrorMessage);
            return BadRequest($"Failed to save preferences: {result.ErrorMessage}");
        }

        _logger.LogInformation("Successfully saved preferences for user: {UserId}", userId);

        var response = new UserPreferencesResponse
        {
            UserId = result.Preferences!.UserId,
            Chart = ChartPreferencesDto.FromChartPreferences(result.Preferences.Chart),
            Indicators = result.Preferences.Indicators.Select(IndicatorPreferenceDto.FromIndicatorPreference).ToList(),
            FavoritePairs = new List<string>(result.Preferences.FavoritePairs),
            UI = UIPreferencesDto.FromUIPreferences(result.Preferences.UI),
            LastUpdated = result.Preferences.LastUpdated
        };

        return Ok(response);
    }

    /// <summary>
    /// Get default user preferences
    /// </summary>
    /// <returns>Default user preferences structure</returns>
    /// <response code="200">Returns the default preferences structure</response>
    [HttpGet("default")]
    [ProducesResponseType(typeof(UserPreferencesResponse), 200)]
    public ActionResult<UserPreferencesResponse> GetDefaultPreferences()
    {
        _logger.LogInformation("Getting default user preferences");

        var defaultPreferences = Core.Domain.UserPreferences.Create("default");

        var response = new UserPreferencesResponse
        {
            UserId = "default",
            Chart = ChartPreferencesDto.FromChartPreferences(defaultPreferences.Chart),
            Indicators = defaultPreferences.Indicators.Select(IndicatorPreferenceDto.FromIndicatorPreference).ToList(),
            FavoritePairs = new List<string>(defaultPreferences.FavoritePairs),
            UI = UIPreferencesDto.FromUIPreferences(defaultPreferences.UI),
            LastUpdated = defaultPreferences.LastUpdated
        };

        return Ok(response);
    }
}
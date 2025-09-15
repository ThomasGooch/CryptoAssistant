using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Preferences.SaveUserPreferences;

/// <summary>
/// Handler for SaveUserPreferencesCommand
/// </summary>
public interface ISaveUserPreferencesCommandHandler : IQueryHandler<SaveUserPreferencesCommand, SaveUserPreferencesResult>
{
}
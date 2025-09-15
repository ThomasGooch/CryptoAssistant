using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Preferences.GetUserPreferences;

/// <summary>
/// Handler for GetUserPreferencesQuery
/// </summary>
public interface IGetUserPreferencesQueryHandler : IQueryHandler<GetUserPreferencesQuery, GetUserPreferencesResult>
{
}
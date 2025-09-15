using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Domain;

namespace AkashTrends.Application.Features.Alerts.GetUserAlerts;

public class GetUserAlertsQuery : IQuery<GetUserAlertsResult>
{
    public string UserId { get; set; } = string.Empty;
    public bool? OnlyActive { get; set; }
    public bool? OnlyTriggered { get; set; }
}

public class GetUserAlertsResult
{
    public IReadOnlyList<Alert> Alerts { get; set; } = new List<Alert>();
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
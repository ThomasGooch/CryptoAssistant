using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Domain;

namespace AkashTrends.Application.Features.Alerts.CreateAlert;

public class CreateAlertCommand : IQuery<CreateAlertResult>
{
    public string UserId { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public decimal Threshold { get; set; }
    public AlertCondition Condition { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? CooldownSeconds { get; set; }
}

public class CreateAlertResult
{
    public bool Success { get; set; }
    public Alert? Alert { get; set; }
    public string? ErrorMessage { get; set; }
}
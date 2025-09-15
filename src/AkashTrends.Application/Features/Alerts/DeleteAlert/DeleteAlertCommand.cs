using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Alerts.DeleteAlert;

public class DeleteAlertCommand : IQuery<DeleteAlertResult>
{
    public Guid AlertId { get; set; }
}

public class DeleteAlertResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Domain;

namespace AkashTrends.Application.Features.Alerts.UpdateAlert;

public class UpdateAlertCommand : IQuery<UpdateAlertResult>
{
    public Guid AlertId { get; set; }
    public string? Title { get; set; }
    public string? Message { get; set; }
    public decimal? Threshold { get; set; }
    public bool? IsActive { get; set; }
    public bool? Reset { get; set; } // Reset triggered state
    public int? CooldownSeconds { get; set; }
}

public class UpdateAlertResult
{
    public bool Success { get; set; }
    public Alert? Alert { get; set; }
    public string? ErrorMessage { get; set; }
}
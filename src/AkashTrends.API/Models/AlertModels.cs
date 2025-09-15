using AkashTrends.Core.Domain;

namespace AkashTrends.API.Models;

public class AlertResponse
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public decimal Threshold { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsTriggered { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? TriggeredAt { get; set; }
    public decimal? TriggeredPrice { get; set; }
}

public class CreateAlertRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public decimal Threshold { get; set; }
    public AlertCondition Condition { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class UpdateAlertRequest
{
    public string? Title { get; set; }
    public string? Message { get; set; }
    public decimal? Threshold { get; set; }
    public bool? IsActive { get; set; }
    public bool? Reset { get; set; }
}
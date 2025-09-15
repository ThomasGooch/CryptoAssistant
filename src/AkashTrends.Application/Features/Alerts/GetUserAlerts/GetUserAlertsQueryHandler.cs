using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Application.Features.Alerts.GetUserAlerts;

public class GetUserAlertsQueryHandler : IQueryHandler<GetUserAlertsQuery, GetUserAlertsResult>
{
    private readonly IAlertService _alertService;
    private readonly ILogger<GetUserAlertsQueryHandler> _logger;

    public GetUserAlertsQueryHandler(IAlertService alertService, ILogger<GetUserAlertsQueryHandler> logger)
    {
        _alertService = alertService ?? throw new ArgumentNullException(nameof(alertService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<GetUserAlertsResult> Handle(GetUserAlertsQuery query)
    {
        try
        {
            _logger.LogInformation("Getting alerts for user {UserId} (OnlyActive: {OnlyActive}, OnlyTriggered: {OnlyTriggered})",
                query.UserId, query.OnlyActive, query.OnlyTriggered);

            IReadOnlyList<Core.Domain.Alert> alerts;

            if (query.OnlyActive == true)
            {
                alerts = await _alertService.GetActiveUserAlertsAsync(query.UserId);
            }
            else if (query.OnlyTriggered == true)
            {
                alerts = await _alertService.GetTriggeredUserAlertsAsync(query.UserId);
            }
            else
            {
                alerts = await _alertService.GetUserAlertsAsync(query.UserId);
            }

            _logger.LogInformation("Retrieved {Count} alerts for user {UserId}", alerts.Count, query.UserId);

            return new GetUserAlertsResult
            {
                Success = true,
                Alerts = alerts
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get alerts for user {UserId}", query.UserId);

            return new GetUserAlertsResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                Alerts = new List<Core.Domain.Alert>()
            };
        }
    }
}
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Application.Features.Alerts.UpdateAlert;

public class UpdateAlertCommandHandler : IQueryHandler<UpdateAlertCommand, UpdateAlertResult>
{
    private readonly IAlertService _alertService;
    private readonly ILogger<UpdateAlertCommandHandler> _logger;

    public UpdateAlertCommandHandler(IAlertService alertService, ILogger<UpdateAlertCommandHandler> logger)
    {
        _alertService = alertService ?? throw new ArgumentNullException(nameof(alertService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<UpdateAlertResult> Handle(UpdateAlertCommand command)
    {
        try
        {
            _logger.LogInformation("Updating alert {AlertId}", command.AlertId);

            var alert = await _alertService.GetAlertAsync(command.AlertId);
            if (alert == null)
            {
                _logger.LogWarning("Alert {AlertId} not found", command.AlertId);
                return new UpdateAlertResult
                {
                    Success = false,
                    ErrorMessage = $"Alert not found: {command.AlertId}"
                };
            }

            // Apply updates
            if (!string.IsNullOrWhiteSpace(command.Title))
            {
                alert.UpdateTitle(command.Title);
            }

            if (!string.IsNullOrWhiteSpace(command.Message))
            {
                alert.UpdateMessage(command.Message);
            }

            if (command.Threshold.HasValue)
            {
                alert.UpdateThreshold(command.Threshold.Value);
            }

            if (command.IsActive.HasValue)
            {
                if (command.IsActive.Value)
                {
                    alert.Activate();
                }
                else
                {
                    alert.Deactivate();
                }
            }

            if (command.Reset == true)
            {
                alert.Reset();
            }

            await _alertService.UpdateAlertAsync(alert);

            _logger.LogInformation("Successfully updated alert {AlertId}", command.AlertId);

            return new UpdateAlertResult
            {
                Success = true,
                Alert = alert
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update alert {AlertId}", command.AlertId);

            return new UpdateAlertResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }
}
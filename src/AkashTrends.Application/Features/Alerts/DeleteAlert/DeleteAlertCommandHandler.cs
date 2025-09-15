using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Application.Features.Alerts.DeleteAlert;

public class DeleteAlertCommandHandler : IQueryHandler<DeleteAlertCommand, DeleteAlertResult>
{
    private readonly IAlertService _alertService;
    private readonly ILogger<DeleteAlertCommandHandler> _logger;

    public DeleteAlertCommandHandler(IAlertService alertService, ILogger<DeleteAlertCommandHandler> logger)
    {
        _alertService = alertService ?? throw new ArgumentNullException(nameof(alertService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<DeleteAlertResult> Handle(DeleteAlertCommand command)
    {
        try
        {
            _logger.LogInformation("Deleting alert {AlertId}", command.AlertId);

            // Check if alert exists first
            var exists = await _alertService.AlertExistsAsync(command.AlertId);
            if (!exists)
            {
                _logger.LogWarning("Alert {AlertId} not found for deletion", command.AlertId);
                return new DeleteAlertResult
                {
                    Success = false,
                    ErrorMessage = $"Alert not found: {command.AlertId}"
                };
            }

            await _alertService.DeleteAlertAsync(command.AlertId);

            _logger.LogInformation("Successfully deleted alert {AlertId}", command.AlertId);

            return new DeleteAlertResult
            {
                Success = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete alert {AlertId}", command.AlertId);

            return new DeleteAlertResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }
}
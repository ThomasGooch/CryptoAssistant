using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Application.Features.Alerts.CreateAlert;

public class CreateAlertCommandHandler : IQueryHandler<CreateAlertCommand, CreateAlertResult>
{
    private readonly IAlertService _alertService;
    private readonly ILogger<CreateAlertCommandHandler> _logger;

    public CreateAlertCommandHandler(IAlertService alertService, ILogger<CreateAlertCommandHandler> logger)
    {
        _alertService = alertService ?? throw new ArgumentNullException(nameof(alertService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<CreateAlertResult> Handle(CreateAlertCommand command)
    {
        try
        {
            _logger.LogInformation("Creating alert for user {UserId} for symbol {Symbol} with threshold {Threshold}",
                command.UserId, command.Symbol, command.Threshold);

            var alert = await _alertService.CreateAlertAsync(
                command.UserId,
                command.Symbol,
                command.Threshold,
                command.Condition,
                command.Title,
                command.Message);

            _logger.LogInformation("Successfully created alert {AlertId} for user {UserId}", alert.Id, command.UserId);

            return new CreateAlertResult
            {
                Success = true,
                Alert = alert
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create alert for user {UserId}", command.UserId);

            return new CreateAlertResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }
}
using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Alerts.CreateAlert;
using AkashTrends.Application.Features.Alerts.DeleteAlert;
using AkashTrends.Application.Features.Alerts.GetUserAlerts;
using AkashTrends.Application.Features.Alerts.UpdateAlert;
using AkashTrends.Core.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace AkashTrends.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlertsController : ControllerBase
{
    private readonly IQueryDispatcher _queryDispatcher;
    private readonly ILogger<AlertsController> _logger;

    public AlertsController(IQueryDispatcher queryDispatcher, ILogger<AlertsController> logger)
    {
        _queryDispatcher = queryDispatcher ?? throw new ArgumentNullException(nameof(queryDispatcher));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<IEnumerable<AlertResponse>>> GetUserAlerts(
        string userId,
        [FromQuery] bool onlyActive = false,
        [FromQuery] bool onlyTriggered = false)
    {
        _logger.LogInformation("Getting alerts for user {UserId} (Active: {OnlyActive}, Triggered: {OnlyTriggered})",
            userId, onlyActive, onlyTriggered);

        var query = new GetUserAlertsQuery
        {
            UserId = userId,
            OnlyActive = onlyActive ? true : null,
            OnlyTriggered = onlyTriggered ? true : null
        };

        var result = await _queryDispatcher.Dispatch<GetUserAlertsQuery, GetUserAlertsResult>(query);

        if (!result.Success)
        {
            _logger.LogWarning("Failed to get alerts for user {UserId}: {Error}", userId, result.ErrorMessage);
            return BadRequest($"Failed to get alerts: {result.ErrorMessage}");
        }

        var response = result.Alerts.Select(MapToResponse).ToList();

        _logger.LogInformation("Retrieved {Count} alerts for user {UserId}", response.Count, userId);
        return Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<AlertResponse>> CreateAlert([FromBody] CreateAlertRequest request)
    {
        // Validate request
        if (request == null)
            return BadRequest("Request cannot be null");

        if (string.IsNullOrWhiteSpace(request.UserId))
            return BadRequest("User ID is required");

        if (string.IsNullOrWhiteSpace(request.Symbol))
            return BadRequest("Symbol is required");

        if (request.Threshold <= 0)
            return BadRequest("Threshold must be greater than 0");

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Title is required");

        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest("Message is required");

        _logger.LogInformation("Creating alert for user {UserId} for symbol {Symbol}", request.UserId, request.Symbol);

        try
        {
            var command = new CreateAlertCommand
            {
                UserId = request.UserId,
                Symbol = request.Symbol,
                Threshold = request.Threshold,
                Condition = request.Condition,
                Title = request.Title,
                Message = request.Message
            };

            var result = await _queryDispatcher.Dispatch<CreateAlertCommand, CreateAlertResult>(command);

            if (!result.Success)
            {
                _logger.LogWarning("Failed to create alert for user {UserId}: {Error}", request.UserId, result.ErrorMessage);
                return BadRequest($"Failed to create alert: {result.ErrorMessage}");
            }

            var response = MapToResponse(result.Alert!);

            _logger.LogInformation("Created alert {AlertId} for user {UserId}", result.Alert!.Id, request.UserId);
            return CreatedAtAction(nameof(GetUserAlerts), new { userId = request.UserId }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while creating alert for user {UserId}", request.UserId);
            return StatusCode(500, "An internal server error occurred");
        }
    }

    [HttpPut("{alertId}")]
    public async Task<ActionResult<AlertResponse>> UpdateAlert(Guid alertId, [FromBody] UpdateAlertRequest request)
    {
        _logger.LogInformation("Updating alert {AlertId}", alertId);

        var command = new UpdateAlertCommand
        {
            AlertId = alertId,
            Title = request.Title,
            Message = request.Message,
            Threshold = request.Threshold,
            IsActive = request.IsActive,
            Reset = request.Reset
        };

        var result = await _queryDispatcher.Dispatch<UpdateAlertCommand, UpdateAlertResult>(command);

        if (!result.Success)
        {
            _logger.LogWarning("Failed to update alert {AlertId}: {Error}", alertId, result.ErrorMessage);

            if (result.ErrorMessage?.Contains("not found") == true)
                return NotFound($"Alert not found: {alertId}");

            return BadRequest($"Failed to update alert: {result.ErrorMessage}");
        }

        var response = MapToResponse(result.Alert!);

        _logger.LogInformation("Updated alert {AlertId}", alertId);
        return Ok(response);
    }

    [HttpDelete("{alertId}")]
    public async Task<ActionResult> DeleteAlert(Guid alertId)
    {
        _logger.LogInformation("Deleting alert {AlertId}", alertId);

        var command = new DeleteAlertCommand { AlertId = alertId };
        var result = await _queryDispatcher.Dispatch<DeleteAlertCommand, DeleteAlertResult>(command);

        if (!result.Success)
        {
            _logger.LogWarning("Failed to delete alert {AlertId}: {Error}", alertId, result.ErrorMessage);

            if (result.ErrorMessage?.Contains("not found") == true)
                return NotFound($"Alert not found: {alertId}");

            return BadRequest($"Failed to delete alert: {result.ErrorMessage}");
        }

        _logger.LogInformation("Deleted alert {AlertId}", alertId);
        return NoContent();
    }

    private static AlertResponse MapToResponse(Alert alert)
    {
        return new AlertResponse
        {
            Id = alert.Id,
            UserId = alert.UserId,
            Symbol = alert.Symbol,
            Threshold = alert.Threshold,
            Condition = alert.Condition.ToString().ToLowerInvariant(),
            Title = alert.Title,
            Message = alert.Message,
            IsActive = alert.IsActive,
            IsTriggered = alert.IsTriggered,
            CreatedAt = alert.CreatedAt,
            TriggeredAt = alert.TriggeredAt,
            TriggeredPrice = alert.TriggeredPrice
        };
    }
}
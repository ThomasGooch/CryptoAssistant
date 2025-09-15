using AkashTrends.API.Controllers;
using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Alerts.CreateAlert;
using AkashTrends.Core.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using FluentAssertions;
using Xunit;

namespace AkashTrends.API.Tests.Controllers;

public class AlertsControllerTests
{
    private readonly IQueryDispatcher _mockQueryDispatcher;
    private readonly ILogger<AlertsController> _mockLogger;
    private readonly AlertsController _controller;

    public AlertsControllerTests()
    {
        _mockQueryDispatcher = Substitute.For<IQueryDispatcher>();
        _mockLogger = Substitute.For<ILogger<AlertsController>>();
        _controller = new AlertsController(_mockQueryDispatcher, _mockLogger);
    }

    [Fact]
    public async Task CreateAlert_WithValidRequest_ShouldReturnCreatedResponse()
    {
        // Arrange
        var request = new CreateAlertRequest
        {
            UserId = "user123",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC Alert",
            Message = "BTC crossed $50,000"
        };

        var expectedResult = new CreateAlertResult
        {
            Success = true,
            Alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "BTC Alert", "BTC crossed $50,000")
        };

        _mockQueryDispatcher
            .Dispatch<CreateAlertCommand, CreateAlertResult>(Arg.Any<CreateAlertCommand>())
            .Returns(expectedResult);

        // Act
        var result = await _controller.CreateAlert(request);

        // Assert
        result.Should().BeOfType<ActionResult<AlertResponse>>();
        var actionResult = result.Result;
        actionResult.Should().BeOfType<CreatedAtActionResult>();

        var createdResult = (CreatedAtActionResult)actionResult!;
        createdResult.Value.Should().BeOfType<AlertResponse>();

        var alertResponse = (AlertResponse)createdResult.Value!;
        alertResponse.Id.Should().Be(expectedResult.Alert.Id);
        alertResponse.UserId.Should().Be("user123");
        alertResponse.Symbol.Should().Be("BTC");
        alertResponse.Threshold.Should().Be(50000m);
    }

    [Fact]
    public async Task CreateAlert_WithInvalidRequest_ShouldReturnBadRequest()
    {
        // Arrange
        var request = new CreateAlertRequest
        {
            UserId = "",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC Alert",
            Message = "BTC crossed $50,000"
        };

        // Act
        var result = await _controller.CreateAlert(request);

        // Assert
        result.Should().BeOfType<ActionResult<AlertResponse>>();
        var actionResult = result.Result;
        actionResult.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateAlert_WhenExceptionThrown_ShouldReturnInternalServerError()
    {
        // Arrange
        var request = new CreateAlertRequest
        {
            UserId = "user123",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC Alert",
            Message = "BTC crossed $50,000"
        };

        _mockQueryDispatcher
            .Dispatch<CreateAlertCommand, CreateAlertResult>(Arg.Any<CreateAlertCommand>())
            .Returns(Task.FromException<CreateAlertResult>(new Exception("Database error")));

        // Act
        var result = await _controller.CreateAlert(request);

        // Assert
        result.Should().BeOfType<ActionResult<AlertResponse>>();
        var actionResult = result.Result;
        actionResult.Should().BeOfType<ObjectResult>();

        var objectResult = (ObjectResult)actionResult!;
        objectResult.StatusCode.Should().Be(500);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task CreateAlert_WithInvalidUserId_ShouldReturnBadRequest(string? userId)
    {
        // Arrange
        var request = new CreateAlertRequest
        {
            UserId = userId!,
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC Alert",
            Message = "BTC crossed $50,000"
        };

        // Act
        var result = await _controller.CreateAlert(request);

        // Assert
        result.Should().BeOfType<ActionResult<AlertResponse>>();
        var actionResult = result.Result;
        actionResult.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task CreateAlert_WithInvalidSymbol_ShouldReturnBadRequest(string? symbol)
    {
        // Arrange
        var request = new CreateAlertRequest
        {
            UserId = "user123",
            Symbol = symbol!,
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC Alert",
            Message = "BTC crossed $50,000"
        };

        // Act
        var result = await _controller.CreateAlert(request);

        // Assert
        result.Should().BeOfType<ActionResult<AlertResponse>>();
        var actionResult = result.Result;
        actionResult.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public async Task CreateAlert_WithInvalidThreshold_ShouldReturnBadRequest(decimal threshold)
    {
        // Arrange
        var request = new CreateAlertRequest
        {
            UserId = "user123",
            Symbol = "BTC",
            Threshold = threshold,
            Condition = AlertCondition.Above,
            Title = "BTC Alert",
            Message = "BTC crossed $50,000"
        };

        // Act
        var result = await _controller.CreateAlert(request);

        // Assert
        result.Should().BeOfType<ActionResult<AlertResponse>>();
        var actionResult = result.Result;
        actionResult.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task CreateAlert_WithInvalidTitle_ShouldReturnBadRequest(string? title)
    {
        // Arrange
        var request = new CreateAlertRequest
        {
            UserId = "user123",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = title!,
            Message = "BTC crossed $50,000"
        };

        // Act
        var result = await _controller.CreateAlert(request);

        // Assert
        result.Should().BeOfType<ActionResult<AlertResponse>>();
        var actionResult = result.Result;
        actionResult.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task CreateAlert_WithInvalidMessage_ShouldReturnBadRequest(string? message)
    {
        // Arrange
        var request = new CreateAlertRequest
        {
            UserId = "user123",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC Alert",
            Message = message!
        };

        // Act
        var result = await _controller.CreateAlert(request);

        // Assert
        result.Should().BeOfType<ActionResult<AlertResponse>>();
        var actionResult = result.Result;
        actionResult.Should().BeOfType<BadRequestObjectResult>();
    }
}
using AkashTrends.Application.Features.Alerts.CreateAlert;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.Application.Tests.Features.Alerts;

public class CreateAlertCommandHandlerTests
{
    private readonly Mock<IAlertService> _mockAlertService;
    private readonly Mock<ILogger<CreateAlertCommandHandler>> _mockLogger;
    private readonly CreateAlertCommandHandler _handler;

    public CreateAlertCommandHandlerTests()
    {
        _mockAlertService = new Mock<IAlertService>();
        _mockLogger = new Mock<ILogger<CreateAlertCommandHandler>>();
        _handler = new CreateAlertCommandHandler(_mockAlertService.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task Handle_WithValidCommand_ShouldCreateAlert()
    {
        // Arrange
        var command = new CreateAlertCommand
        {
            UserId = "testUser123",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC High Alert",
            Message = "BTC has exceeded $50,000"
        };

        var expectedAlert = Alert.Create(command.UserId, command.Symbol, command.Threshold,
            command.Condition, command.Title, command.Message);

        _mockAlertService
            .Setup(x => x.CreateAlertAsync(command.UserId, command.Symbol, command.Threshold,
                command.Condition, command.Title, command.Message))
            .ReturnsAsync(expectedAlert);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Alert.Should().NotBeNull();
        result.Alert!.UserId.Should().Be(command.UserId);
        result.Alert.Symbol.Should().Be(command.Symbol);
        result.Alert.Threshold.Should().Be(command.Threshold);
        result.Alert.Condition.Should().Be(command.Condition);
        result.Alert.Title.Should().Be(command.Title);
        result.Alert.Message.Should().Be(command.Message);
        result.ErrorMessage.Should().BeNull();

        _mockAlertService.Verify(x => x.CreateAlertAsync(
            command.UserId, command.Symbol, command.Threshold,
            command.Condition, command.Title, command.Message), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenServiceThrowsException_ShouldReturnFailure()
    {
        // Arrange
        var command = new CreateAlertCommand
        {
            UserId = "testUser123",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC High Alert",
            Message = "BTC has exceeded $50,000"
        };

        var expectedException = new ArgumentException("Invalid symbol");
        _mockAlertService
            .Setup(x => x.CreateAlertAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<decimal>(),
                It.IsAny<AlertCondition>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(expectedException);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Alert.Should().BeNull();
        result.ErrorMessage.Should().Be(expectedException.Message);
    }

    [Fact]
    public async Task Handle_ShouldLogInformationMessages()
    {
        // Arrange
        var command = new CreateAlertCommand
        {
            UserId = "testUser123",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC High Alert",
            Message = "BTC has exceeded $50,000"
        };

        var alert = Alert.Create(command.UserId, command.Symbol, command.Threshold,
            command.Condition, command.Title, command.Message);

        _mockAlertService
            .Setup(x => x.CreateAlertAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<decimal>(),
                It.IsAny<AlertCondition>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(alert);

        // Act
        await _handler.Handle(command);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Creating alert for user")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Successfully created alert")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WhenServiceThrowsException_ShouldLogError()
    {
        // Arrange
        var command = new CreateAlertCommand
        {
            UserId = "testUser123",
            Symbol = "BTC",
            Threshold = 50000m,
            Condition = AlertCondition.Above,
            Title = "BTC High Alert",
            Message = "BTC has exceeded $50,000"
        };

        var expectedException = new InvalidOperationException("Database error");
        _mockAlertService
            .Setup(x => x.CreateAlertAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<decimal>(),
                It.IsAny<AlertCondition>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(expectedException);

        // Act
        await _handler.Handle(command);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to create alert for user")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }
}
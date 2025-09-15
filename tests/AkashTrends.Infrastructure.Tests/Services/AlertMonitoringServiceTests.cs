using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class AlertMonitoringServiceTests
{
    private readonly Mock<ILogger<AlertMonitoringService>> _mockLogger;
    private readonly Mock<IAlertService> _mockAlertService;
    private readonly AlertMonitoringService _service;

    public AlertMonitoringServiceTests()
    {
        _mockLogger = new Mock<ILogger<AlertMonitoringService>>();
        _mockAlertService = new Mock<IAlertService>();

        var serviceProvider = new ServiceCollection()
            .AddSingleton(_mockAlertService.Object)
            .BuildServiceProvider();

        _service = new AlertMonitoringService(_mockLogger.Object, serviceProvider);
    }

    [Fact]
    public async Task StartMonitoringAsync_ShouldSetIsMonitoringToTrue()
    {
        // Act
        await _service.StartMonitoringAsync();

        // Assert
        _service.IsMonitoring.Should().BeTrue();
    }

    [Fact]
    public async Task StopMonitoringAsync_ShouldSetIsMonitoringToFalse()
    {
        // Arrange
        await _service.StartMonitoringAsync();

        // Act
        await _service.StopMonitoringAsync();

        // Assert
        _service.IsMonitoring.Should().BeFalse();
    }

    [Fact]
    public async Task CheckAlertsForPriceUpdateAsync_WithMatchingAlert_ShouldTriggerAlert()
    {
        // Arrange
        var symbol = "BTC";
        var currentPrice = 55000m;
        var alert = Alert.Create("user123", symbol, 50000m, AlertCondition.Above, "BTC High", "BTC exceeded $50k");

        var alerts = new List<Alert> { alert };
        _mockAlertService
            .Setup(x => x.GetActiveAlertsForSymbolAsync(symbol))
            .ReturnsAsync(alerts);

        var alertTriggeredEventRaised = false;
        Alert? triggeredAlert = null;
        decimal triggeredPrice = 0;

        _service.AlertTriggered += (sender, args) =>
        {
            alertTriggeredEventRaised = true;
            triggeredAlert = args.Alert;
            triggeredPrice = args.TriggerPrice;
        };

        await _service.StartMonitoringAsync();

        // Act
        await _service.CheckAlertsForPriceUpdateAsync(symbol, currentPrice);

        // Assert
        alertTriggeredEventRaised.Should().BeTrue();
        triggeredAlert.Should().Be(alert);
        triggeredPrice.Should().Be(currentPrice);
        alert.IsTriggered.Should().BeTrue();
        alert.TriggeredPrice.Should().Be(currentPrice);

        _mockAlertService.Verify(x => x.GetActiveAlertsForSymbolAsync(symbol), Times.Once);
        _mockAlertService.Verify(x => x.UpdateAlertAsync(alert), Times.Once);
    }

    [Fact]
    public async Task CheckAlertsForPriceUpdateAsync_WithNonMatchingAlert_ShouldNotTriggerAlert()
    {
        // Arrange
        var symbol = "BTC";
        var currentPrice = 45000m; // Below threshold
        var alert = Alert.Create("user123", symbol, 50000m, AlertCondition.Above, "BTC High", "BTC exceeded $50k");

        var alerts = new List<Alert> { alert };
        _mockAlertService
            .Setup(x => x.GetActiveAlertsForSymbolAsync(symbol))
            .ReturnsAsync(alerts);

        var alertTriggeredEventRaised = false;
        _service.AlertTriggered += (sender, args) => alertTriggeredEventRaised = true;

        await _service.StartMonitoringAsync();

        // Act
        await _service.CheckAlertsForPriceUpdateAsync(symbol, currentPrice);

        // Assert
        alertTriggeredEventRaised.Should().BeFalse();
        alert.IsTriggered.Should().BeFalse();
        alert.TriggeredPrice.Should().BeNull();

        _mockAlertService.Verify(x => x.GetActiveAlertsForSymbolAsync(symbol), Times.Once);
        _mockAlertService.Verify(x => x.UpdateAlertAsync(It.IsAny<Alert>()), Times.Never);
    }

    [Fact]
    public async Task CheckAlertsForPriceUpdateAsync_WithMultipleMatchingAlerts_ShouldTriggerAll()
    {
        // Arrange
        var symbol = "BTC";
        var currentPrice = 55000m;

        var alert1 = Alert.Create("user1", symbol, 50000m, AlertCondition.Above, "User1 High", "Message1");
        var alert2 = Alert.Create("user2", symbol, 52000m, AlertCondition.Above, "User2 High", "Message2");
        var alert3 = Alert.Create("user3", symbol, 60000m, AlertCondition.Above, "User3 High", "Message3"); // Should not trigger

        var alerts = new List<Alert> { alert1, alert2, alert3 };
        _mockAlertService
            .Setup(x => x.GetActiveAlertsForSymbolAsync(symbol))
            .ReturnsAsync(alerts);

        var triggeredAlerts = new List<Alert>();
        _service.AlertTriggered += (sender, args) => triggeredAlerts.Add(args.Alert);

        await _service.StartMonitoringAsync();

        // Act
        await _service.CheckAlertsForPriceUpdateAsync(symbol, currentPrice);

        // Assert
        triggeredAlerts.Should().HaveCount(2);
        triggeredAlerts.Should().Contain(alert1);
        triggeredAlerts.Should().Contain(alert2);
        triggeredAlerts.Should().NotContain(alert3);

        alert1.IsTriggered.Should().BeTrue();
        alert2.IsTriggered.Should().BeTrue();
        alert3.IsTriggered.Should().BeFalse();

        _mockAlertService.Verify(x => x.UpdateAlertAsync(alert1), Times.Once);
        _mockAlertService.Verify(x => x.UpdateAlertAsync(alert2), Times.Once);
        _mockAlertService.Verify(x => x.UpdateAlertAsync(alert3), Times.Never);
    }

    [Fact]
    public async Task CheckAlertsForPriceUpdateAsync_WithBelowConditionAlert_ShouldTriggerCorrectly()
    {
        // Arrange
        var symbol = "BTC";
        var currentPrice = 45000m;
        var alert = Alert.Create("user123", symbol, 50000m, AlertCondition.Below, "BTC Low", "BTC dropped below $50k");

        var alerts = new List<Alert> { alert };
        _mockAlertService
            .Setup(x => x.GetActiveAlertsForSymbolAsync(symbol))
            .ReturnsAsync(alerts);

        var alertTriggeredEventRaised = false;
        _service.AlertTriggered += (sender, args) => alertTriggeredEventRaised = true;

        await _service.StartMonitoringAsync();

        // Act
        await _service.CheckAlertsForPriceUpdateAsync(symbol, currentPrice);

        // Assert
        alertTriggeredEventRaised.Should().BeTrue();
        alert.IsTriggered.Should().BeTrue();
        alert.TriggeredPrice.Should().Be(currentPrice);
    }

    [Fact]
    public async Task CheckAlertsForPriceUpdateAsync_WhenNotMonitoring_ShouldNotProcessAlerts()
    {
        // Arrange
        var symbol = "BTC";
        var currentPrice = 55000m;

        // Don't start monitoring

        // Act
        await _service.CheckAlertsForPriceUpdateAsync(symbol, currentPrice);

        // Assert
        _mockAlertService.Verify(x => x.GetActiveAlertsForSymbolAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CheckAlertsForPriceUpdateAsync_WithNoActiveAlerts_ShouldNotTriggerEvents()
    {
        // Arrange
        var symbol = "BTC";
        var currentPrice = 55000m;

        _mockAlertService
            .Setup(x => x.GetActiveAlertsForSymbolAsync(symbol))
            .ReturnsAsync(new List<Alert>());

        var alertTriggeredEventRaised = false;
        _service.AlertTriggered += (sender, args) => alertTriggeredEventRaised = true;

        await _service.StartMonitoringAsync();

        // Act
        await _service.CheckAlertsForPriceUpdateAsync(symbol, currentPrice);

        // Assert
        alertTriggeredEventRaised.Should().BeFalse();
        _mockAlertService.Verify(x => x.GetActiveAlertsForSymbolAsync(symbol), Times.Once);
        _mockAlertService.Verify(x => x.UpdateAlertAsync(It.IsAny<Alert>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task CheckAlertsForPriceUpdateAsync_WithInvalidSymbol_ShouldThrowArgumentException(string? symbol)
    {
        // Arrange
        await _service.StartMonitoringAsync();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CheckAlertsForPriceUpdateAsync(symbol, 50000m));
        exception.Message.Should().Contain("Symbol cannot be empty or null");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public async Task CheckAlertsForPriceUpdateAsync_WithInvalidPrice_ShouldThrowArgumentException(decimal price)
    {
        // Arrange
        await _service.StartMonitoringAsync();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CheckAlertsForPriceUpdateAsync("BTC", price));
        exception.Message.Should().Contain("Price must be greater than 0");
    }

    [Fact]
    public async Task CheckAlertsForPriceUpdateAsync_WhenServiceThrowsException_ShouldLogAndNotThrow()
    {
        // Arrange
        var symbol = "BTC";
        var currentPrice = 55000m;

        _mockAlertService
            .Setup(x => x.GetActiveAlertsForSymbolAsync(symbol))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        await _service.StartMonitoringAsync();

        // Act & Assert (should not throw)
        await _service.CheckAlertsForPriceUpdateAsync(symbol, currentPrice);

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Error checking alerts for symbol")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void AlertTriggeredEventArgs_Constructor_ShouldSetProperties()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        var triggerPrice = 55000m;
        var triggerTime = DateTimeOffset.UtcNow;

        // Act
        var eventArgs = new AlertTriggeredEventArgs(alert, triggerPrice, triggerTime);

        // Assert
        eventArgs.Alert.Should().Be(alert);
        eventArgs.TriggerPrice.Should().Be(triggerPrice);
        eventArgs.TriggerTime.Should().Be(triggerTime);
    }

    [Fact]
    public void AlertTriggeredEventArgs_WithNullAlert_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new AlertTriggeredEventArgs(null, 55000m, DateTimeOffset.UtcNow));
    }
}
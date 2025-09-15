using AkashTrends.Core.Domain;
using AkashTrends.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class InMemoryAlertServiceTests
{
    private readonly Mock<ILogger<InMemoryAlertService>> _mockLogger;
    private readonly InMemoryAlertService _service;

    public InMemoryAlertServiceTests()
    {
        _mockLogger = new Mock<ILogger<InMemoryAlertService>>();
        _service = new InMemoryAlertService(_mockLogger.Object);
    }

    [Fact]
    public async Task CreateAlertAsync_WithValidParameters_ShouldCreateAndReturnAlert()
    {
        // Arrange
        var userId = "testUser123";
        var symbol = "BTC";
        var threshold = 50000m;
        var condition = AlertCondition.Above;
        var title = "BTC High Alert";
        var message = "BTC has exceeded $50,000";

        // Act
        var result = await _service.CreateAlertAsync(userId, symbol, threshold, condition, title, message);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(userId);
        result.Symbol.Should().Be(symbol);
        result.Threshold.Should().Be(threshold);
        result.Condition.Should().Be(condition);
        result.Title.Should().Be(title);
        result.Message.Should().Be(message);
        result.IsActive.Should().BeTrue();
        result.IsTriggered.Should().BeFalse();
    }

    [Fact]
    public async Task GetAlertAsync_WithExistingAlert_ShouldReturnAlert()
    {
        // Arrange
        var alert = await _service.CreateAlertAsync("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");

        // Act
        var result = await _service.GetAlertAsync(alert.Id);

        // Assert
        result.Should().NotBeNull();
        result.Should().Be(alert);
    }

    [Fact]
    public async Task GetAlertAsync_WithNonExistentAlert_ShouldReturnNull()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.GetAlertAsync(nonExistentId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetUserAlertsAsync_WithExistingAlerts_ShouldReturnUserAlerts()
    {
        // Arrange
        var userId = "testUser123";
        var otherUserId = "otherUser456";

        var alert1 = await _service.CreateAlertAsync(userId, "BTC", 50000m, AlertCondition.Above, "Alert 1", "Message 1");
        var alert2 = await _service.CreateAlertAsync(userId, "ETH", 3000m, AlertCondition.Below, "Alert 2", "Message 2");
        var alert3 = await _service.CreateAlertAsync(otherUserId, "BTC", 45000m, AlertCondition.Above, "Alert 3", "Message 3");

        // Act
        var result = await _service.GetUserAlertsAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(alert1);
        result.Should().Contain(alert2);
        result.Should().NotContain(alert3);
    }

    [Fact]
    public async Task GetUserAlertsAsync_WithNonExistentUser_ShouldReturnEmptyList()
    {
        // Arrange
        var nonExistentUserId = "nonExistentUser";

        // Act
        var result = await _service.GetUserAlertsAsync(nonExistentUserId);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetActiveUserAlertsAsync_ShouldReturnOnlyActiveAlerts()
    {
        // Arrange
        var userId = "testUser123";

        var activeAlert = await _service.CreateAlertAsync(userId, "BTC", 50000m, AlertCondition.Above, "Active", "Message");
        var inactiveAlert = await _service.CreateAlertAsync(userId, "ETH", 3000m, AlertCondition.Below, "Inactive", "Message");

        inactiveAlert.Deactivate();
        await _service.UpdateAlertAsync(inactiveAlert);

        // Act
        var result = await _service.GetActiveUserAlertsAsync(userId);

        // Assert
        result.Should().HaveCount(1);
        result.Should().Contain(activeAlert);
        result.Should().NotContain(inactiveAlert);
    }

    [Fact]
    public async Task GetTriggeredUserAlertsAsync_ShouldReturnOnlyTriggeredAlerts()
    {
        // Arrange
        var userId = "testUser123";

        var triggeredAlert = await _service.CreateAlertAsync(userId, "BTC", 50000m, AlertCondition.Above, "Triggered", "Message");
        var untriggeredAlert = await _service.CreateAlertAsync(userId, "ETH", 3000m, AlertCondition.Below, "Untriggered", "Message");

        triggeredAlert.Trigger(55000m);
        await _service.UpdateAlertAsync(triggeredAlert);

        // Act
        var result = await _service.GetTriggeredUserAlertsAsync(userId);

        // Assert
        result.Should().HaveCount(1);
        result.Should().Contain(triggeredAlert);
        result.Should().NotContain(untriggeredAlert);
    }

    [Fact]
    public async Task GetActiveAlertsForSymbolAsync_ShouldReturnActiveAlertsForSymbol()
    {
        // Arrange
        var symbol = "BTC";

        var activeAlert = await _service.CreateAlertAsync("user1", symbol, 50000m, AlertCondition.Above, "Active BTC", "Message");
        var inactiveAlert = await _service.CreateAlertAsync("user2", symbol, 45000m, AlertCondition.Below, "Inactive BTC", "Message");
        var otherSymbolAlert = await _service.CreateAlertAsync("user3", "ETH", 3000m, AlertCondition.Above, "ETH Alert", "Message");

        inactiveAlert.Deactivate();
        await _service.UpdateAlertAsync(inactiveAlert);

        // Act
        var result = await _service.GetActiveAlertsForSymbolAsync(symbol);

        // Assert
        result.Should().HaveCount(1);
        result.Should().Contain(activeAlert);
        result.Should().NotContain(inactiveAlert);
        result.Should().NotContain(otherSymbolAlert);
    }

    [Fact]
    public async Task UpdateAlertAsync_WithValidAlert_ShouldUpdateAlert()
    {
        // Arrange
        var alert = await _service.CreateAlertAsync("user123", "BTC", 50000m, AlertCondition.Above, "Original Title", "Original Message");

        alert.UpdateTitle("Updated Title");
        alert.UpdateMessage("Updated Message");

        // Act
        await _service.UpdateAlertAsync(alert);

        // Assert
        var retrievedAlert = await _service.GetAlertAsync(alert.Id);
        retrievedAlert.Should().NotBeNull();
        retrievedAlert!.Title.Should().Be("Updated Title");
        retrievedAlert.Message.Should().Be("Updated Message");
    }

    [Fact]
    public async Task UpdateAlertAsync_WithNonExistentAlert_ShouldThrowArgumentException()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.UpdateAlertAsync(alert));
        exception.Message.Should().Contain("Alert not found");
    }

    [Fact]
    public async Task DeleteAlertAsync_WithExistingAlert_ShouldRemoveAlert()
    {
        // Arrange
        var alert = await _service.CreateAlertAsync("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");

        // Act
        await _service.DeleteAlertAsync(alert.Id);

        // Assert
        var retrievedAlert = await _service.GetAlertAsync(alert.Id);
        retrievedAlert.Should().BeNull();

        var exists = await _service.AlertExistsAsync(alert.Id);
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAlertAsync_WithNonExistentAlert_ShouldNotThrow()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act & Assert (should not throw)
        await _service.DeleteAlertAsync(nonExistentId);
    }

    [Fact]
    public async Task AlertExistsAsync_WithExistingAlert_ShouldReturnTrue()
    {
        // Arrange
        var alert = await _service.CreateAlertAsync("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");

        // Act
        var result = await _service.AlertExistsAsync(alert.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AlertExistsAsync_WithNonExistentAlert_ShouldReturnFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.AlertExistsAsync(nonExistentId);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Service_ShouldMaintainDataIntegrity_AcrossOperations()
    {
        // Arrange
        var user1Id = "user1";
        var user2Id = "user2";

        var alert1 = await _service.CreateAlertAsync(user1Id, "BTC", 50000m, AlertCondition.Above, "User1 BTC High", "Message 1");
        var alert2 = await _service.CreateAlertAsync(user1Id, "ETH", 3000m, AlertCondition.Below, "User1 ETH Low", "Message 2");
        var alert3 = await _service.CreateAlertAsync(user2Id, "BTC", 45000m, AlertCondition.Below, "User2 BTC Low", "Message 3");

        // Act - Trigger one alert, deactivate another
        alert1.Trigger(55000m);
        await _service.UpdateAlertAsync(alert1);

        alert2.Deactivate();
        await _service.UpdateAlertAsync(alert2);

        // Assert - Verify state consistency
        var user1Alerts = await _service.GetUserAlertsAsync(user1Id);
        user1Alerts.Should().HaveCount(2);

        var user1ActiveAlerts = await _service.GetActiveUserAlertsAsync(user1Id);
        user1ActiveAlerts.Should().HaveCount(0); // alert1 is triggered, alert2 is inactive

        var user1TriggeredAlerts = await _service.GetTriggeredUserAlertsAsync(user1Id);
        user1TriggeredAlerts.Should().HaveCount(1);
        user1TriggeredAlerts.Should().Contain(alert1);

        var btcActiveAlerts = await _service.GetActiveAlertsForSymbolAsync("BTC");
        btcActiveAlerts.Should().HaveCount(1);
        btcActiveAlerts.Should().Contain(alert3);
    }

    [Fact]
    public async Task ConcurrentOperations_ShouldHandleMultipleUsers()
    {
        // Arrange
        var tasks = new List<Task<Alert>>();
        var userIds = Enumerable.Range(1, 10).Select(i => $"user{i}").ToList();

        // Act - Create alerts for multiple users concurrently
        foreach (var userId in userIds)
        {
            tasks.Add(_service.CreateAlertAsync(userId, "BTC", 50000m, AlertCondition.Above, $"Alert for {userId}", "Message"));
        }

        var alerts = await Task.WhenAll(tasks);

        // Assert - Verify all users have their alerts
        foreach (var userId in userIds)
        {
            var userAlerts = await _service.GetUserAlertsAsync(userId);
            userAlerts.Should().HaveCount(1);
            userAlerts.First().UserId.Should().Be(userId);
        }

        alerts.Should().HaveCount(10);
        alerts.Select(a => a.UserId).Should().BeEquivalentTo(userIds);
    }
}
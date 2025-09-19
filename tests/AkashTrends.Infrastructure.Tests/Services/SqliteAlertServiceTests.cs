using AkashTrends.Core.Domain;
using AkashTrends.Infrastructure.Data;
using AkashTrends.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class SqliteAlertServiceTests : IDisposable
{
    private readonly AlertDbContext _context;
    private readonly SqliteAlertService _alertService;
    private readonly Mock<ILogger<SqliteAlertService>> _mockLogger;

    public SqliteAlertServiceTests()
    {
        // Use in-memory database for testing
        var options = new DbContextOptionsBuilder<AlertDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new AlertDbContext(options);
        _mockLogger = new Mock<ILogger<SqliteAlertService>>();
        _alertService = new SqliteAlertService(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task CreateAlertAsync_WithValidData_ShouldCreateAlert()
    {
        // Arrange
        var userId = "testUser123";
        var symbol = "BTC";
        var threshold = 50000m;
        var condition = AlertCondition.Above;
        var title = "BTC High Alert";
        var message = "BTC has exceeded $50,000";
        var cooldownSeconds = 60;

        // Act
        var result = await _alertService.CreateAlertAsync(
            userId, symbol, threshold, condition, title, message, cooldownSeconds);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(userId);
        result.Symbol.Should().Be(symbol.ToUpperInvariant());
        result.Threshold.Should().Be(threshold);
        result.Condition.Should().Be(condition);
        result.Title.Should().Be(title);
        result.Message.Should().Be(message);
        result.CooldownSeconds.Should().Be(cooldownSeconds);
        result.IsActive.Should().BeTrue();
        result.IsTriggered.Should().BeFalse();

        // Verify it was saved to database
        var saved = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == result.Id);
        saved.Should().NotBeNull();
        saved!.CooldownSeconds.Should().Be(cooldownSeconds);
    }

    [Fact]
    public async Task CreateAlertAsync_WithNullCooldown_ShouldCreateAlertWithNullCooldown()
    {
        // Arrange
        var userId = "testUser123";
        var symbol = "ETH";
        var threshold = 3000m;
        var condition = AlertCondition.Below;
        var title = "ETH Low Alert";
        var message = "ETH has dropped below $3,000";

        // Act
        var result = await _alertService.CreateAlertAsync(
            userId, symbol, threshold, condition, title, message, null);

        // Assert
        result.Should().NotBeNull();
        result.CooldownSeconds.Should().BeNull();

        // Verify it was saved to database
        var saved = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == result.Id);
        saved.Should().NotBeNull();
        saved!.CooldownSeconds.Should().BeNull();
    }

    [Fact]
    public async Task GetAlertAsync_WithExistingId_ShouldReturnAlert()
    {
        // Arrange
        var alert = Alert.Create("testUser", "BTC", 50000m, AlertCondition.Above, "Test", "Message", 30);
        _context.Alerts.Add(alert);
        await _context.SaveChangesAsync();

        // Act
        var result = await _alertService.GetAlertAsync(alert.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(alert.Id);
        result.CooldownSeconds.Should().Be(30);
    }

    [Fact]
    public async Task GetAlertAsync_WithNonExistentId_ShouldReturnNull()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _alertService.GetAlertAsync(nonExistentId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetUserAlertsAsync_ShouldReturnAlertsOrderedByCreationDate()
    {
        // Arrange
        var userId = "testUser";
        var alert1 = Alert.Create(userId, "BTC", 50000m, AlertCondition.Above, "Alert 1", "Message 1", 30);
        var alert2 = Alert.Create(userId, "ETH", 3000m, AlertCondition.Below, "Alert 2", "Message 2", 60);
        var alert3 = Alert.Create("otherUser", "BTC", 45000m, AlertCondition.Above, "Alert 3", "Message 3");

        _context.Alerts.AddRange(alert1, alert2, alert3);
        await _context.SaveChangesAsync();

        // Act
        var result = await _alertService.GetUserAlertsAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(a => a.UserId == userId);
        result.Should().BeInDescendingOrder(a => a.CreatedAt);

        // Verify cooldown values are preserved
        result.Should().Contain(a => a.CooldownSeconds == 30);
        result.Should().Contain(a => a.CooldownSeconds == 60);
    }

    [Fact]
    public async Task UpdateAlertAsync_ShouldPersistChangesIncludingCooldown()
    {
        // Arrange
        var alert = Alert.Create("testUser", "BTC", 50000m, AlertCondition.Above, "Original Title", "Original Message", 30);
        _context.Alerts.Add(alert);
        await _context.SaveChangesAsync();

        // Act - Update all properties including cooldown
        alert.UpdateTitle("Updated Title");
        alert.UpdateMessage("Updated Message");
        alert.UpdateThreshold(55000m);
        alert.UpdateCooldown(120);
        await _alertService.UpdateAlertAsync(alert);

        // Assert
        var updated = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == alert.Id);
        updated.Should().NotBeNull();
        updated!.Title.Should().Be("Updated Title");
        updated.Message.Should().Be("Updated Message");
        updated.Threshold.Should().Be(55000m);
        updated.CooldownSeconds.Should().Be(120);
    }

    [Fact]
    public async Task DeleteAlertAsync_ShouldRemoveAlertFromDatabase()
    {
        // Arrange
        var alert = Alert.Create("testUser", "BTC", 50000m, AlertCondition.Above, "Test", "Message");
        _context.Alerts.Add(alert);
        await _context.SaveChangesAsync();

        // Act
        await _alertService.DeleteAlertAsync(alert.Id);

        // Assert
        var deleted = await _context.Alerts.FirstOrDefaultAsync(a => a.Id == alert.Id);
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task GetActiveUserAlertsAsync_ShouldReturnOnlyActiveUnTriggeredAlerts()
    {
        // Arrange
        var userId = "testUser";
        var activeAlert = Alert.Create(userId, "BTC", 50000m, AlertCondition.Above, "Active", "Message", 45);
        var inactiveAlert = Alert.Create(userId, "ETH", 3000m, AlertCondition.Below, "Inactive", "Message", 90);
        var triggeredAlert = Alert.Create(userId, "LTC", 100m, AlertCondition.Above, "Triggered", "Message");

        inactiveAlert.Deactivate();
        triggeredAlert.Trigger(105m);

        _context.Alerts.AddRange(activeAlert, inactiveAlert, triggeredAlert);
        await _context.SaveChangesAsync();

        // Act
        var result = await _alertService.GetActiveUserAlertsAsync(userId);

        // Assert
        result.Should().HaveCount(1);
        result.Should().OnlyContain(a => a.IsActive && !a.IsTriggered);
        result.First().CooldownSeconds.Should().Be(45);
    }

    [Fact]
    public async Task GetActiveAlertsForSymbolAsync_ShouldReturnAlertsForSpecificSymbol()
    {
        // Arrange
        var btcAlert1 = Alert.Create("user1", "BTC", 50000m, AlertCondition.Above, "BTC Alert 1", "Message", 60);
        var btcAlert2 = Alert.Create("user2", "BTC", 45000m, AlertCondition.Below, "BTC Alert 2", "Message", 30);
        var ethAlert = Alert.Create("user1", "ETH", 3000m, AlertCondition.Above, "ETH Alert", "Message");

        _context.Alerts.AddRange(btcAlert1, btcAlert2, ethAlert);
        await _context.SaveChangesAsync();

        // Act
        var result = await _alertService.GetActiveAlertsForSymbolAsync("BTC");

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(a => a.Symbol == "BTC");
        result.Should().BeInAscendingOrder(a => a.Threshold);
    }

    [Fact]
    public async Task AlertExistsAsync_WithExistingAlert_ShouldReturnTrue()
    {
        // Arrange
        var alert = Alert.Create("testUser", "BTC", 50000m, AlertCondition.Above, "Test", "Message", 75);
        _context.Alerts.Add(alert);
        await _context.SaveChangesAsync();

        // Act
        var result = await _alertService.AlertExistsAsync(alert.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AlertExistsAsync_WithNonExistentAlert_ShouldReturnFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _alertService.AlertExistsAsync(nonExistentId);

        // Assert
        result.Should().BeFalse();
    }
}
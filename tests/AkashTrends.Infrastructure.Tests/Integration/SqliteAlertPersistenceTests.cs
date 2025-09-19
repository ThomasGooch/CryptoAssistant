using AkashTrends.Core.Domain;
using AkashTrends.Infrastructure.Data;
using AkashTrends.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Integration;

public class SqliteAlertPersistenceTests : IDisposable
{
    private readonly string _databasePath;
    private readonly AlertDbContext _context;
    private readonly SqliteAlertService _alertService;
    private readonly Mock<ILogger<SqliteAlertService>> _mockLogger;

    public SqliteAlertPersistenceTests()
    {
        _databasePath = Path.Combine(Path.GetTempPath(), $"test_alerts_{Guid.NewGuid()}.db");

        var options = new DbContextOptionsBuilder<AlertDbContext>()
            .UseSqlite($"Data Source={_databasePath}")
            .Options;

        _context = new AlertDbContext(options);
        _context.Database.EnsureCreated();

        _mockLogger = new Mock<ILogger<SqliteAlertService>>();
        _alertService = new SqliteAlertService(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Dispose();

        // Clean up the test database file
        if (File.Exists(_databasePath))
        {
            File.Delete(_databasePath);
        }
    }

    [Fact]
    public async Task AlertsPersist_AcrossServiceInstances_WithCooldownData()
    {
        // Arrange - Create an alert with specific cooldown
        var userId = "testUser123";
        var symbol = "BTC";
        var threshold = 50000m;
        var condition = AlertCondition.Above;
        var title = "BTC High Alert";
        var message = "BTC has exceeded $50,000";
        var cooldownSeconds = 120;

        // Act 1 - Create alert in first service instance
        var createdAlert = await _alertService.CreateAlertAsync(
            userId, symbol, threshold, condition, title, message, cooldownSeconds);
        var createdId = createdAlert.Id;

        // Dispose current service and context to simulate application restart
        _context.Dispose();

        // Create new service instance with same database
        var newOptions = new DbContextOptionsBuilder<AlertDbContext>()
            .UseSqlite($"Data Source={_databasePath}")
            .Options;

        using var newContext = new AlertDbContext(newOptions);
        var newLogger = new Mock<ILogger<SqliteAlertService>>();
        var newAlertService = new SqliteAlertService(newContext, newLogger.Object);

        // Act 2 - Retrieve alert from new service instance
        var retrievedAlert = await newAlertService.GetAlertAsync(createdId);

        // Assert - Verify data persisted correctly including cooldown
        retrievedAlert.Should().NotBeNull();
        retrievedAlert!.Id.Should().Be(createdId);
        retrievedAlert.UserId.Should().Be(userId);
        retrievedAlert.Symbol.Should().Be(symbol.ToUpperInvariant());
        retrievedAlert.Threshold.Should().Be(threshold);
        retrievedAlert.Condition.Should().Be(condition);
        retrievedAlert.Title.Should().Be(title);
        retrievedAlert.Message.Should().Be(message);
        retrievedAlert.CooldownSeconds.Should().Be(cooldownSeconds);
        retrievedAlert.IsActive.Should().BeTrue();
        retrievedAlert.IsTriggered.Should().BeFalse();

        // Act 3 - Verify CRUD operations work across instances
        retrievedAlert.UpdateCooldown(60);
        retrievedAlert.UpdateTitle("Updated Title");

        await newAlertService.UpdateAlertAsync(retrievedAlert);

        var updatedAlert = await newAlertService.GetAlertAsync(createdId);

        // Assert - Verify updates persisted
        updatedAlert.Should().NotBeNull();
        updatedAlert!.CooldownSeconds.Should().Be(60);
        updatedAlert.Title.Should().Be("Updated Title");
    }

    [Fact]
    public async Task AlertDatabase_SupportsComplexQueries_WithCooldownFiltering()
    {
        // Arrange - Create multiple alerts with different cooldowns
        var alerts = new[]
        {
            await _alertService.CreateAlertAsync("user1", "BTC", 50000m, AlertCondition.Above, "BTC Alert 1", "Message 1", 30),
            await _alertService.CreateAlertAsync("user1", "ETH", 3000m, AlertCondition.Below, "ETH Alert 1", "Message 2", 60),
            await _alertService.CreateAlertAsync("user2", "BTC", 45000m, AlertCondition.Above, "BTC Alert 2", "Message 3", 120),
            await _alertService.CreateAlertAsync("user2", "LTC", 100m, AlertCondition.Below, "LTC Alert 1", "Message 4"), // null cooldown
        };

        // Act - Query alerts for user1
        var user1Alerts = await _alertService.GetUserAlertsAsync("user1");
        var user2Alerts = await _alertService.GetUserAlertsAsync("user2");
        var btcAlerts = await _alertService.GetActiveAlertsForSymbolAsync("BTC");

        // Assert - Verify query results include cooldown data
        user1Alerts.Should().HaveCount(2);
        user1Alerts.Should().Contain(a => a.CooldownSeconds == 30);
        user1Alerts.Should().Contain(a => a.CooldownSeconds == 60);

        user2Alerts.Should().HaveCount(2);
        user2Alerts.Should().Contain(a => a.CooldownSeconds == 120);
        user2Alerts.Should().Contain(a => a.CooldownSeconds == null);

        btcAlerts.Should().HaveCount(2);
        btcAlerts.Should().OnlyContain(a => a.Symbol == "BTC");
        btcAlerts.Should().Contain(a => a.CooldownSeconds == 30);
        btcAlerts.Should().Contain(a => a.CooldownSeconds == 120);
    }

    [Fact]
    public async Task Database_HandlesNullCooldownValues_Correctly()
    {
        // Arrange & Act - Create alert with null cooldown
        var alert = await _alertService.CreateAlertAsync(
            "testUser", "BTC", 50000m, AlertCondition.Above, "Test Alert", "Test Message", null);

        // Act - Retrieve from database
        var retrieved = await _alertService.GetAlertAsync(alert.Id);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.CooldownSeconds.Should().BeNull();

        // Act - Update to specific cooldown
        retrieved.UpdateCooldown(45);
        await _alertService.UpdateAlertAsync(retrieved);

        var updated = await _alertService.GetAlertAsync(alert.Id);

        // Assert
        updated.Should().NotBeNull();
        updated!.CooldownSeconds.Should().Be(45);

        // Act - Update back to null cooldown
        updated.UpdateCooldown(null);
        await _alertService.UpdateAlertAsync(updated);

        var finalResult = await _alertService.GetAlertAsync(alert.Id);

        // Assert
        finalResult.Should().NotBeNull();
        finalResult!.CooldownSeconds.Should().BeNull();
    }
}
using AkashTrends.Core.Domain;
using AkashTrends.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.Services;

public class InMemoryUserPreferencesServiceTests
{
    private readonly Mock<ILogger<InMemoryUserPreferencesService>> _mockLogger;
    private readonly InMemoryUserPreferencesService _service;

    public InMemoryUserPreferencesServiceTests()
    {
        _mockLogger = new Mock<ILogger<InMemoryUserPreferencesService>>();
        _service = new InMemoryUserPreferencesService(_mockLogger.Object);
    }

    [Fact]
    public async Task GetUserPreferencesAsync_WithValidUserId_WhenUserNotExists_ShouldReturnNull()
    {
        // Arrange
        var userId = "nonExistentUser";

        // Act
        var result = await _service.GetUserPreferencesAsync(userId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetUserPreferencesAsync_WithValidUserId_WhenUserExists_ShouldReturnPreferences()
    {
        // Arrange
        var userId = "testUser123";
        var preferences = UserPreferences.Create(userId);
        await _service.SaveUserPreferencesAsync(preferences);

        // Act
        var result = await _service.GetUserPreferencesAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().Be(preferences);
        result!.UserId.Should().Be(userId);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task GetUserPreferencesAsync_WithInvalidUserId_ShouldThrowArgumentException(string? userId)
    {
        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.GetUserPreferencesAsync(userId));
        exception.Message.Should().Contain("User ID cannot be empty or null");
    }

    [Fact]
    public async Task SaveUserPreferencesAsync_WithValidPreferences_ShouldStorePreferences()
    {
        // Arrange
        var userId = "testUser123";
        var preferences = UserPreferences.Create(userId);

        // Act
        await _service.SaveUserPreferencesAsync(preferences);

        // Assert
        var retrieved = await _service.GetUserPreferencesAsync(userId);
        retrieved.Should().NotBeNull();
        retrieved.Should().Be(preferences);
    }

    [Fact]
    public async Task SaveUserPreferencesAsync_WithNull_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.SaveUserPreferencesAsync(null));
    }

    [Fact]
    public async Task SaveUserPreferencesAsync_WithExistingUser_ShouldUpdatePreferences()
    {
        // Arrange
        var userId = "testUser123";
        var originalPreferences = UserPreferences.Create(userId);
        var updatedPreferences = UserPreferences.Create(userId);
        var newChartPreferences = new ChartPreferences(ChartType.Candlestick, "4h", false, true, "dark");
        updatedPreferences.UpdateChartPreferences(newChartPreferences);

        // Act
        await _service.SaveUserPreferencesAsync(originalPreferences);
        await _service.SaveUserPreferencesAsync(updatedPreferences);

        // Assert
        var retrieved = await _service.GetUserPreferencesAsync(userId);
        retrieved.Should().NotBeNull();
        retrieved.Should().Be(updatedPreferences);
        retrieved!.Chart.Type.Should().Be(ChartType.Candlestick);
        retrieved.Chart.TimeFrame.Should().Be("4h");
    }

    [Fact]
    public async Task DeleteUserPreferencesAsync_WithExistingUser_ShouldRemovePreferences()
    {
        // Arrange
        var userId = "testUser123";
        var preferences = UserPreferences.Create(userId);
        await _service.SaveUserPreferencesAsync(preferences);

        // Verify it exists first
        var beforeDelete = await _service.GetUserPreferencesAsync(userId);
        beforeDelete.Should().NotBeNull();

        // Act
        await _service.DeleteUserPreferencesAsync(userId);

        // Assert
        var afterDelete = await _service.GetUserPreferencesAsync(userId);
        afterDelete.Should().BeNull();
    }

    [Fact]
    public async Task DeleteUserPreferencesAsync_WithNonExistentUser_ShouldNotThrow()
    {
        // Arrange
        var userId = "nonExistentUser";

        // Act & Assert (should not throw)
        await _service.DeleteUserPreferencesAsync(userId);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task DeleteUserPreferencesAsync_WithInvalidUserId_ShouldThrowArgumentException(string? userId)
    {
        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.DeleteUserPreferencesAsync(userId));
        exception.Message.Should().Contain("User ID cannot be empty or null");
    }

    [Fact]
    public async Task UserPreferencesExistAsync_WithExistingUser_ShouldReturnTrue()
    {
        // Arrange
        var userId = "testUser123";
        var preferences = UserPreferences.Create(userId);
        await _service.SaveUserPreferencesAsync(preferences);

        // Act
        var result = await _service.UserPreferencesExistAsync(userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task UserPreferencesExistAsync_WithNonExistentUser_ShouldReturnFalse()
    {
        // Arrange
        var userId = "nonExistentUser";

        // Act
        var result = await _service.UserPreferencesExistAsync(userId);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task UserPreferencesExistAsync_WithInvalidUserId_ShouldThrowArgumentException(string? userId)
    {
        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.UserPreferencesExistAsync(userId));
        exception.Message.Should().Contain("User ID cannot be empty or null");
    }

    [Fact]
    public async Task ConcurrentOperations_ShouldHandleMultipleUsers()
    {
        // Arrange
        var tasks = new List<Task>();
        var userIds = Enumerable.Range(1, 10).Select(i => $"user{i}").ToList();

        // Act - Save preferences for multiple users concurrently
        foreach (var userId in userIds)
        {
            tasks.Add(Task.Run(async () =>
            {
                var preferences = UserPreferences.Create(userId);
                await _service.SaveUserPreferencesAsync(preferences);
            }));
        }

        await Task.WhenAll(tasks);

        // Assert - Verify all users were saved
        foreach (var userId in userIds)
        {
            var exists = await _service.UserPreferencesExistAsync(userId);
            exists.Should().BeTrue($"User {userId} should exist");

            var preferences = await _service.GetUserPreferencesAsync(userId);
            preferences.Should().NotBeNull();
            preferences!.UserId.Should().Be(userId);
        }
    }

    [Fact]
    public async Task Service_ShouldMaintainDataIntegrity_AcrossOperations()
    {
        // Arrange
        var userId1 = "user1";
        var userId2 = "user2";
        var preferences1 = UserPreferences.Create(userId1);
        var preferences2 = UserPreferences.Create(userId2);

        var newChart = new ChartPreferences(ChartType.Bar, "1d", false, false, "custom");
        preferences1.UpdateChartPreferences(newChart);

        var favoritePairs = new List<string> { "BTC-USD", "ETH-USD", "SOL-USD" };
        preferences2.UpdateFavoritePairs(favoritePairs);

        // Act
        await _service.SaveUserPreferencesAsync(preferences1);
        await _service.SaveUserPreferencesAsync(preferences2);

        // Assert
        var retrieved1 = await _service.GetUserPreferencesAsync(userId1);
        var retrieved2 = await _service.GetUserPreferencesAsync(userId2);

        // User 1 should have updated chart preferences
        retrieved1.Should().NotBeNull();
        retrieved1!.Chart.Type.Should().Be(ChartType.Bar);
        retrieved1.Chart.TimeFrame.Should().Be("1d");
        retrieved1.FavoritePairs.Should().BeEmpty();

        // User 2 should have updated favorite pairs
        retrieved2.Should().NotBeNull();
        retrieved2!.Chart.Type.Should().Be(ChartType.Line); // Default
        retrieved2.FavoritePairs.Should().BeEquivalentTo(favoritePairs);

        // Verify users are independent
        retrieved1.UserId.Should().NotBe(retrieved2!.UserId);
    }
}
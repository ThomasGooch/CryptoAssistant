using AkashTrends.Application.Features.Preferences.GetUserPreferences;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.Application.Tests.Features.Preferences;

public class GetUserPreferencesQueryHandlerTests
{
    private readonly Mock<IUserPreferencesService> _mockUserPreferencesService;
    private readonly Mock<ILogger<GetUserPreferencesQueryHandler>> _mockLogger;
    private readonly GetUserPreferencesQueryHandler _handler;

    public GetUserPreferencesQueryHandlerTests()
    {
        _mockUserPreferencesService = new Mock<IUserPreferencesService>();
        _mockLogger = new Mock<ILogger<GetUserPreferencesQueryHandler>>();
        _handler = new GetUserPreferencesQueryHandler(_mockUserPreferencesService.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task Handle_WithExistingUser_ShouldReturnPreferences()
    {
        // Arrange
        var userId = "testUser123";
        var expectedPreferences = UserPreferences.Create(userId);
        var query = new GetUserPreferencesQuery { UserId = userId };

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ReturnsAsync(expectedPreferences);

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotBeNull();
        result.Preferences.Should().Be(expectedPreferences);
        result.Exists.Should().BeTrue();

        _mockUserPreferencesService.Verify(x => x.GetUserPreferencesAsync(userId), Times.Once);
    }

    [Fact]
    public async Task Handle_WithNonExistingUser_ShouldReturnNullPreferences()
    {
        // Arrange
        var userId = "nonExistentUser";
        var query = new GetUserPreferencesQuery { UserId = userId };

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ReturnsAsync((UserPreferences)null);

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotBeNull();
        result.Preferences.Should().BeNull();
        result.Exists.Should().BeFalse();

        _mockUserPreferencesService.Verify(x => x.GetUserPreferencesAsync(userId), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenServiceThrowsException_ShouldPropagateException()
    {
        // Arrange
        var userId = "testUser";
        var query = new GetUserPreferencesQuery { UserId = userId };
        var expectedException = new InvalidOperationException("Database error");

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ThrowsAsync(expectedException);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _handler.Handle(query));
        exception.Should().Be(expectedException);
    }

    [Fact]
    public async Task Handle_ShouldLogInformationMessages()
    {
        // Arrange
        var userId = "testUser";
        var preferences = UserPreferences.Create(userId);
        var query = new GetUserPreferencesQuery { UserId = userId };

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ReturnsAsync(preferences);

        // Act
        await _handler.Handle(query);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Getting user preferences for user")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Retrieved user preferences for user")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }
}
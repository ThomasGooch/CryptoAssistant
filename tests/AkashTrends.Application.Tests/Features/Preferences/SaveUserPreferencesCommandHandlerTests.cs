using AkashTrends.Application.Features.Preferences.SaveUserPreferences;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.Application.Tests.Features.Preferences;

public class SaveUserPreferencesCommandHandlerTests
{
    private readonly Mock<IUserPreferencesService> _mockUserPreferencesService;
    private readonly Mock<ILogger<SaveUserPreferencesCommandHandler>> _mockLogger;
    private readonly SaveUserPreferencesCommandHandler _handler;

    public SaveUserPreferencesCommandHandlerTests()
    {
        _mockUserPreferencesService = new Mock<IUserPreferencesService>();
        _mockLogger = new Mock<ILogger<SaveUserPreferencesCommandHandler>>();
        _handler = new SaveUserPreferencesCommandHandler(_mockUserPreferencesService.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task Handle_WithExistingUser_ShouldUpdatePreferences()
    {
        // Arrange
        var userId = "testUser123";
        var existingPreferences = UserPreferences.Create(userId);
        var newChartPreferences = new ChartPreferences(ChartType.Candlestick, "4h", false, true, "dark");

        var command = new SaveUserPreferencesCommand
        {
            UserId = userId,
            Chart = newChartPreferences
        };

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ReturnsAsync(existingPreferences);

        _mockUserPreferencesService
            .Setup(x => x.SaveUserPreferencesAsync(It.IsAny<UserPreferences>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Preferences.Should().NotBeNull();
        result.Preferences!.Chart.Type.Should().Be(ChartType.Candlestick);
        result.ErrorMessage.Should().BeNull();

        _mockUserPreferencesService.Verify(x => x.GetUserPreferencesAsync(userId), Times.Once);
        _mockUserPreferencesService.Verify(x => x.SaveUserPreferencesAsync(It.IsAny<UserPreferences>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithNewUser_ShouldCreatePreferences()
    {
        // Arrange
        var userId = "newUser123";
        var newUIPreferences = new UIPreferences(true, "es", true, 10000);

        var command = new SaveUserPreferencesCommand
        {
            UserId = userId,
            UI = newUIPreferences
        };

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ReturnsAsync((UserPreferences)null);

        _mockUserPreferencesService
            .Setup(x => x.SaveUserPreferencesAsync(It.IsAny<UserPreferences>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Preferences.Should().NotBeNull();
        result.Preferences!.UserId.Should().Be(userId);
        result.Preferences.UI.DarkMode.Should().BeTrue();
        result.Preferences.UI.Language.Should().Be("es");
        result.ErrorMessage.Should().BeNull();

        _mockUserPreferencesService.Verify(x => x.GetUserPreferencesAsync(userId), Times.Once);
        _mockUserPreferencesService.Verify(x => x.SaveUserPreferencesAsync(It.IsAny<UserPreferences>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithIndicatorPreferences_ShouldUpdateIndicators()
    {
        // Arrange
        var userId = "testUser";
        var existingPreferences = UserPreferences.Create(userId);
        var indicators = new List<IndicatorPreference>
        {
            new IndicatorPreference(Core.Analysis.Indicators.IndicatorType.MACD, 26, true, "#ff0000"),
            new IndicatorPreference(Core.Analysis.Indicators.IndicatorType.RelativeStrengthIndex, 14, false, "#00ff00")
        };

        var command = new SaveUserPreferencesCommand
        {
            UserId = userId,
            Indicators = indicators
        };

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ReturnsAsync(existingPreferences);

        _mockUserPreferencesService
            .Setup(x => x.SaveUserPreferencesAsync(It.IsAny<UserPreferences>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Preferences.Should().NotBeNull();
        result.Preferences!.Indicators.Should().HaveCount(2);
        result.Preferences.Indicators.Should().Contain(i => i.Type == Core.Analysis.Indicators.IndicatorType.MACD);
        result.Preferences.Indicators.Should().Contain(i => i.Type == Core.Analysis.Indicators.IndicatorType.RelativeStrengthIndex);
    }

    [Fact]
    public async Task Handle_WithFavoritePairs_ShouldUpdateFavorites()
    {
        // Arrange
        var userId = "testUser";
        var existingPreferences = UserPreferences.Create(userId);
        var favoritePairs = new List<string> { "BTC-USD", "ETH-USD", "ADA-USD" };

        var command = new SaveUserPreferencesCommand
        {
            UserId = userId,
            FavoritePairs = favoritePairs
        };

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ReturnsAsync(existingPreferences);

        _mockUserPreferencesService
            .Setup(x => x.SaveUserPreferencesAsync(It.IsAny<UserPreferences>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Preferences.Should().NotBeNull();
        result.Preferences!.FavoritePairs.Should().BeEquivalentTo(favoritePairs);
    }

    [Fact]
    public async Task Handle_WhenServiceThrowsException_ShouldReturnFailure()
    {
        // Arrange
        var userId = "testUser";
        var command = new SaveUserPreferencesCommand { UserId = userId };
        var expectedException = new InvalidOperationException("Database error");

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ThrowsAsync(expectedException);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Preferences.Should().BeNull();
        result.ErrorMessage.Should().Be("Database error");
    }

    [Fact]
    public async Task Handle_ShouldLogInformationAndErrorMessages()
    {
        // Arrange
        var userId = "testUser";
        var command = new SaveUserPreferencesCommand { UserId = userId };
        var expectedException = new InvalidOperationException("Database error");

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ThrowsAsync(expectedException);

        // Act
        await _handler.Handle(command);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Saving user preferences for user")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Failed to save user preferences for user")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WithPartialUpdate_ShouldOnlyUpdateProvidedFields()
    {
        // Arrange
        var userId = "testUser";
        var existingPreferences = UserPreferences.Create(userId);
        var originalChart = existingPreferences.Chart;
        var originalUI = existingPreferences.UI;

        var newFavoritePairs = new List<string> { "SOL-USD" };

        var command = new SaveUserPreferencesCommand
        {
            UserId = userId,
            FavoritePairs = newFavoritePairs
            // Not updating Chart or UI
        };

        _mockUserPreferencesService
            .Setup(x => x.GetUserPreferencesAsync(userId))
            .ReturnsAsync(existingPreferences);

        _mockUserPreferencesService
            .Setup(x => x.SaveUserPreferencesAsync(It.IsAny<UserPreferences>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Preferences.Should().NotBeNull();

        // Only FavoritePairs should be updated
        result.Preferences!.FavoritePairs.Should().BeEquivalentTo(newFavoritePairs);

        // Other fields should remain unchanged
        result.Preferences.Chart.Type.Should().Be(originalChart.Type);
        result.Preferences.UI.DarkMode.Should().Be(originalUI.DarkMode);
    }
}
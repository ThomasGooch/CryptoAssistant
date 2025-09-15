using AkashTrends.API.Controllers;
using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Preferences.GetUserPreferences;
using AkashTrends.Application.Features.Preferences.SaveUserPreferences;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AkashTrends.API.Tests.Controllers;

public class PreferencesControllerTests
{
    private readonly Mock<IQueryDispatcher> _mockQueryDispatcher;
    private readonly Mock<ILogger<PreferencesController>> _mockLogger;
    private readonly PreferencesController _controller;

    public PreferencesControllerTests()
    {
        _mockQueryDispatcher = new Mock<IQueryDispatcher>();
        _mockLogger = new Mock<ILogger<PreferencesController>>();
        _controller = new PreferencesController(_mockQueryDispatcher.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task GetUserPreferences_WithExistingUser_ShouldReturnOk()
    {
        // Arrange
        var userId = "testUser123";
        var preferences = UserPreferences.Create(userId);
        var chartPreferences = new ChartPreferences(ChartType.Candlestick, "4h", false, true, "dark");
        preferences.UpdateChartPreferences(chartPreferences);

        var queryResult = new GetUserPreferencesResult
        {
            Preferences = preferences,
            Exists = true
        };

        _mockQueryDispatcher
            .Setup(x => x.Dispatch<GetUserPreferencesQuery, GetUserPreferencesResult>(It.IsAny<GetUserPreferencesQuery>()))
            .ReturnsAsync(queryResult);

        // Act
        var result = await _controller.GetUserPreferences(userId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;

        response.UserId.Should().Be(userId);
        response.Chart.Type.Should().Be("candlestick");
        response.Chart.TimeFrame.Should().Be("4h");
        response.Chart.ShowVolume.Should().BeFalse();
    }

    [Fact]
    public async Task GetUserPreferences_WithNonExistentUser_ShouldReturnNotFound()
    {
        // Arrange
        var userId = "nonExistentUser";
        var queryResult = new GetUserPreferencesResult
        {
            Preferences = null,
            Exists = false
        };

        _mockQueryDispatcher
            .Setup(x => x.Dispatch<GetUserPreferencesQuery, GetUserPreferencesResult>(It.IsAny<GetUserPreferencesQuery>()))
            .ReturnsAsync(queryResult);

        // Act
        var result = await _controller.GetUserPreferences(userId);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().Be($"Preferences not found for user: {userId}");
    }

    [Fact]
    public async Task SaveUserPreferences_WithValidRequest_ShouldReturnOk()
    {
        // Arrange
        var userId = "testUser123";
        var request = new UserPreferencesRequest
        {
            Chart = new ChartPreferencesDto
            {
                Type = "line",
                TimeFrame = "1h",
                ShowVolume = true,
                ShowGrid = false,
                ColorScheme = "default"
            },
            FavoritePairs = new List<string> { "BTC-USD", "ETH-USD" }
        };

        var savedPreferences = UserPreferences.Create(userId);
        var commandResult = new SaveUserPreferencesResult
        {
            Success = true,
            Preferences = savedPreferences
        };

        _mockQueryDispatcher
            .Setup(x => x.Dispatch<SaveUserPreferencesCommand, SaveUserPreferencesResult>(It.IsAny<SaveUserPreferencesCommand>()))
            .ReturnsAsync(commandResult);

        // Act
        var result = await _controller.SaveUserPreferences(userId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;

        response.UserId.Should().Be(userId);
    }

    [Fact]
    public async Task SaveUserPreferences_WithFailedSave_ShouldReturnBadRequest()
    {
        // Arrange
        var userId = "testUser123";
        var request = new UserPreferencesRequest();
        var errorMessage = "Database connection failed";

        var commandResult = new SaveUserPreferencesResult
        {
            Success = false,
            ErrorMessage = errorMessage
        };

        _mockQueryDispatcher
            .Setup(x => x.Dispatch<SaveUserPreferencesCommand, SaveUserPreferencesResult>(It.IsAny<SaveUserPreferencesCommand>()))
            .ReturnsAsync(commandResult);

        // Act
        var result = await _controller.SaveUserPreferences(userId, request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be($"Failed to save preferences: {errorMessage}");
    }

    [Fact]
    public async Task SaveUserPreferences_WithIndicators_ShouldMapCorrectly()
    {
        // Arrange
        var userId = "testUser123";
        var request = new UserPreferencesRequest
        {
            Indicators = new List<IndicatorPreferenceDto>
            {
                new IndicatorPreferenceDto
                {
                    Type = IndicatorType.MACD,
                    Period = 26,
                    IsVisible = true,
                    Color = "#ff0000",
                    Parameters = new Dictionary<string, object> { { "fast", 12 }, { "slow", 26 } }
                },
                new IndicatorPreferenceDto
                {
                    Type = IndicatorType.RelativeStrengthIndex,
                    Period = 14,
                    IsVisible = false,
                    Color = "#00ff00"
                }
            }
        };

        var savedPreferences = UserPreferences.Create(userId);
        var commandResult = new SaveUserPreferencesResult
        {
            Success = true,
            Preferences = savedPreferences
        };

        _mockQueryDispatcher
            .Setup(x => x.Dispatch<SaveUserPreferencesCommand, SaveUserPreferencesResult>(It.IsAny<SaveUserPreferencesCommand>()))
            .ReturnsAsync(commandResult)
            .Callback<SaveUserPreferencesCommand>(cmd =>
            {
                // Verify the command was mapped correctly
                cmd.Indicators.Should().HaveCount(2);
                cmd.Indicators!.First().Type.Should().Be(IndicatorType.MACD);
                cmd.Indicators.First().Period.Should().Be(26);
                cmd.Indicators.First().Parameters.Should().ContainKeys("fast", "slow");
            });

        // Act
        var result = await _controller.SaveUserPreferences(userId, request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task SaveUserPreferences_WithUIPreferences_ShouldMapCorrectly()
    {
        // Arrange
        var userId = "testUser123";
        var request = new UserPreferencesRequest
        {
            UI = new UIPreferencesDto
            {
                DarkMode = true,
                Language = "es",
                ShowAdvancedFeatures = true,
                RefreshInterval = 10000
            }
        };

        var savedPreferences = UserPreferences.Create(userId);
        var commandResult = new SaveUserPreferencesResult
        {
            Success = true,
            Preferences = savedPreferences
        };

        _mockQueryDispatcher
            .Setup(x => x.Dispatch<SaveUserPreferencesCommand, SaveUserPreferencesResult>(It.IsAny<SaveUserPreferencesCommand>()))
            .ReturnsAsync(commandResult)
            .Callback<SaveUserPreferencesCommand>(cmd =>
            {
                // Verify the command was mapped correctly
                cmd.UI.Should().NotBeNull();
                cmd.UI!.DarkMode.Should().BeTrue();
                cmd.UI.Language.Should().Be("es");
                cmd.UI.ShowAdvancedFeatures.Should().BeTrue();
                cmd.UI.RefreshInterval.Should().Be(10000);
            });

        // Act
        var result = await _controller.SaveUserPreferences(userId, request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetDefaultPreferences_ShouldReturnOk()
    {
        // Act
        var result = _controller.GetDefaultPreferences();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UserPreferencesResponse>().Subject;

        response.UserId.Should().Be("default");
        response.Chart.Should().NotBeNull();
        response.UI.Should().NotBeNull();
        response.Indicators.Should().NotBeNull();
        response.FavoritePairs.Should().NotBeNull();
    }

    [Fact]
    public async Task Controller_ShouldLogInformationMessages()
    {
        // Arrange
        var userId = "testUser";
        var preferences = UserPreferences.Create(userId);
        var queryResult = new GetUserPreferencesResult
        {
            Preferences = preferences,
            Exists = true
        };

        _mockQueryDispatcher
            .Setup(x => x.Dispatch<GetUserPreferencesQuery, GetUserPreferencesResult>(It.IsAny<GetUserPreferencesQuery>()))
            .ReturnsAsync(queryResult);

        // Act
        await _controller.GetUserPreferences(userId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Getting preferences for user")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Retrieved preferences for user")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    public async Task GetUserPreferences_WithInvalidUserId_ShouldStillProcessRequest(string userId)
    {
        // Arrange
        var queryResult = new GetUserPreferencesResult
        {
            Preferences = null,
            Exists = false
        };

        _mockQueryDispatcher
            .Setup(x => x.Dispatch<GetUserPreferencesQuery, GetUserPreferencesResult>(It.IsAny<GetUserPreferencesQuery>()))
            .ReturnsAsync(queryResult);

        // Act
        var result = await _controller.GetUserPreferences(userId);

        // Assert
        // Controller should process the request and let the service handle validation
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }
}
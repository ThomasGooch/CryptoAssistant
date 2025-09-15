using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Domain;

public class UserPreferencesTests
{
    [Fact]
    public void Create_WithValidUserId_ShouldCreateInstance()
    {
        // Arrange
        var userId = "testUser123";

        // Act
        var preferences = UserPreferences.Create(userId);

        // Assert
        preferences.Should().NotBeNull();
        preferences.UserId.Should().Be(userId);
        preferences.Chart.Should().NotBeNull();
        preferences.Indicators.Should().NotBeNull().And.BeEmpty();
        preferences.FavoritePairs.Should().NotBeNull().And.BeEmpty();
        preferences.UI.Should().NotBeNull();
        preferences.LastUpdated.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidUserId_ShouldThrowArgumentException(string userId)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => UserPreferences.Create(userId));
        exception.Message.Should().Contain("User ID cannot be empty or null");
    }

    [Fact]
    public void UpdateChartPreferences_WithValidPreferences_ShouldUpdateAndTimestamp()
    {
        // Arrange
        var preferences = UserPreferences.Create("testUser");
        var originalTimestamp = preferences.LastUpdated;
        var newChartPreferences = new ChartPreferences(ChartType.Candlestick, "4h", false, true, "dark");

        // Wait a small amount to ensure timestamp changes
        Thread.Sleep(1);

        // Act
        preferences.UpdateChartPreferences(newChartPreferences);

        // Assert
        preferences.Chart.Should().Be(newChartPreferences);
        preferences.Chart.Type.Should().Be(ChartType.Candlestick);
        preferences.Chart.TimeFrame.Should().Be("4h");
        preferences.Chart.ShowVolume.Should().BeFalse();
        preferences.Chart.ShowGrid.Should().BeTrue();
        preferences.Chart.ColorScheme.Should().Be("dark");
        preferences.LastUpdated.Should().BeAfter(originalTimestamp);
    }

    [Fact]
    public void UpdateChartPreferences_WithNull_ShouldThrowArgumentNullException()
    {
        // Arrange
        var preferences = UserPreferences.Create("testUser");

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => preferences.UpdateChartPreferences(null));
    }

    [Fact]
    public void UpdateIndicators_WithValidIndicators_ShouldUpdateAndTimestamp()
    {
        // Arrange
        var preferences = UserPreferences.Create("testUser");
        var originalTimestamp = preferences.LastUpdated;
        var indicators = new List<IndicatorPreference>
        {
            new IndicatorPreference(IndicatorType.MACD, 12, true, "#ff0000"),
            new IndicatorPreference(IndicatorType.RelativeStrengthIndex, 14, false, "#00ff00")
        };

        Thread.Sleep(1);

        // Act
        preferences.UpdateIndicators(indicators);

        // Assert
        preferences.Indicators.Should().BeEquivalentTo(indicators);
        preferences.Indicators.Should().HaveCount(2);
        preferences.LastUpdated.Should().BeAfter(originalTimestamp);
    }

    [Fact]
    public void UpdateIndicators_WithNull_ShouldThrowArgumentNullException()
    {
        // Arrange
        var preferences = UserPreferences.Create("testUser");

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => preferences.UpdateIndicators(null));
    }

    [Fact]
    public void UpdateFavoritePairs_WithValidPairs_ShouldUpdateAndTimestamp()
    {
        // Arrange
        var preferences = UserPreferences.Create("testUser");
        var originalTimestamp = preferences.LastUpdated;
        var favoritePairs = new List<string> { "BTC-USD", "ETH-USD", "ADA-USD" };

        Thread.Sleep(1);

        // Act
        preferences.UpdateFavoritePairs(favoritePairs);

        // Assert
        preferences.FavoritePairs.Should().BeEquivalentTo(favoritePairs);
        preferences.FavoritePairs.Should().HaveCount(3);
        preferences.LastUpdated.Should().BeAfter(originalTimestamp);
    }

    [Fact]
    public void UpdateFavoritePairs_WithNull_ShouldThrowArgumentNullException()
    {
        // Arrange
        var preferences = UserPreferences.Create("testUser");

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => preferences.UpdateFavoritePairs(null));
    }

    [Fact]
    public void UpdateUIPreferences_WithValidPreferences_ShouldUpdateAndTimestamp()
    {
        // Arrange
        var preferences = UserPreferences.Create("testUser");
        var originalTimestamp = preferences.LastUpdated;
        var uiPreferences = new UIPreferences(true, "es", true, 10000);

        Thread.Sleep(1);

        // Act
        preferences.UpdateUIPreferences(uiPreferences);

        // Assert
        preferences.UI.Should().Be(uiPreferences);
        preferences.UI.DarkMode.Should().BeTrue();
        preferences.UI.Language.Should().Be("es");
        preferences.UI.ShowAdvancedFeatures.Should().BeTrue();
        preferences.UI.RefreshInterval.Should().Be(10000);
        preferences.LastUpdated.Should().BeAfter(originalTimestamp);
    }

    [Fact]
    public void UpdateUIPreferences_WithNull_ShouldThrowArgumentNullException()
    {
        // Arrange
        var preferences = UserPreferences.Create("testUser");

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => preferences.UpdateUIPreferences(null));
    }
}

public class ChartPreferencesTests
{
    [Fact]
    public void Constructor_WithValidParameters_ShouldCreateInstance()
    {
        // Arrange & Act
        var chartPreferences = new ChartPreferences(ChartType.Line, "1h", true, false, "default");

        // Assert
        chartPreferences.Should().NotBeNull();
        chartPreferences.Type.Should().Be(ChartType.Line);
        chartPreferences.TimeFrame.Should().Be("1h");
        chartPreferences.ShowVolume.Should().BeTrue();
        chartPreferences.ShowGrid.Should().BeFalse();
        chartPreferences.ColorScheme.Should().Be("default");
    }

    [Fact]
    public void Constructor_WithNullTimeFrame_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new ChartPreferences(ChartType.Line, null, true, false, "default"));
    }

    [Fact]
    public void Constructor_WithNullColorScheme_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new ChartPreferences(ChartType.Line, "1h", true, false, null));
    }

    [Fact]
    public void Default_ShouldReturnDefaultPreferences()
    {
        // Act
        var defaults = ChartPreferences.Default();

        // Assert
        defaults.Should().NotBeNull();
        defaults.Type.Should().Be(ChartType.Line);
        defaults.TimeFrame.Should().Be("1h");
        defaults.ShowVolume.Should().BeTrue();
        defaults.ShowGrid.Should().BeTrue();
        defaults.ColorScheme.Should().Be("default");
    }
}

public class IndicatorPreferenceTests
{
    [Fact]
    public void Constructor_WithValidParameters_ShouldCreateInstance()
    {
        // Arrange
        var parameters = new Dictionary<string, object> { { "multiplier", 2.0 } };

        // Act
        var indicatorPreference = new IndicatorPreference(IndicatorType.BollingerBands, 20, true, "#0000ff", parameters);

        // Assert
        indicatorPreference.Should().NotBeNull();
        indicatorPreference.Type.Should().Be(IndicatorType.BollingerBands);
        indicatorPreference.Period.Should().Be(20);
        indicatorPreference.IsVisible.Should().BeTrue();
        indicatorPreference.Color.Should().Be("#0000ff");
        indicatorPreference.Parameters.Should().ContainKey("multiplier");
        indicatorPreference.Parameters["multiplier"].Should().Be(2.0);
    }

    [Fact]
    public void Constructor_WithNullColor_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new IndicatorPreference(IndicatorType.SimpleMovingAverage, 10, true, null));
    }

    [Fact]
    public void Constructor_WithNullParameters_ShouldCreateEmptyParameters()
    {
        // Act
        var indicatorPreference = new IndicatorPreference(IndicatorType.SimpleMovingAverage, 10, true, "#ff0000", null);

        // Assert
        indicatorPreference.Parameters.Should().NotBeNull().And.BeEmpty();
    }
}

public class UIPreferencesTests
{
    [Fact]
    public void Constructor_WithValidParameters_ShouldCreateInstance()
    {
        // Act
        var uiPreferences = new UIPreferences(true, "fr", false, 3000);

        // Assert
        uiPreferences.Should().NotBeNull();
        uiPreferences.DarkMode.Should().BeTrue();
        uiPreferences.Language.Should().Be("fr");
        uiPreferences.ShowAdvancedFeatures.Should().BeFalse();
        uiPreferences.RefreshInterval.Should().Be(3000);
    }

    [Fact]
    public void Constructor_WithNullLanguage_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new UIPreferences(false, null, false, 5000));
    }

    [Fact]
    public void Default_ShouldReturnDefaultPreferences()
    {
        // Act
        var defaults = UIPreferences.Default();

        // Assert
        defaults.Should().NotBeNull();
        defaults.DarkMode.Should().BeFalse();
        defaults.Language.Should().Be("en");
        defaults.ShowAdvancedFeatures.Should().BeFalse();
        defaults.RefreshInterval.Should().Be(5000);
    }
}
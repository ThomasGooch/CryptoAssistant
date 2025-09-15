using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;

namespace AkashTrends.API.Models;

/// <summary>
/// Request model for saving user preferences
/// </summary>
public class UserPreferencesRequest
{
    /// <summary>
    /// Chart preferences
    /// </summary>
    public ChartPreferencesDto? Chart { get; set; }

    /// <summary>
    /// Indicator preferences
    /// </summary>
    public List<IndicatorPreferenceDto>? Indicators { get; set; }

    /// <summary>
    /// Favorite trading pairs
    /// </summary>
    public List<string>? FavoritePairs { get; set; }

    /// <summary>
    /// UI preferences
    /// </summary>
    public UIPreferencesDto? UI { get; set; }
}

/// <summary>
/// Response model for user preferences
/// </summary>
public class UserPreferencesResponse
{
    /// <summary>
    /// User ID
    /// </summary>
    public required string UserId { get; set; }

    /// <summary>
    /// Chart preferences
    /// </summary>
    public required ChartPreferencesDto Chart { get; set; }

    /// <summary>
    /// Indicator preferences
    /// </summary>
    public required List<IndicatorPreferenceDto> Indicators { get; set; }

    /// <summary>
    /// Favorite trading pairs
    /// </summary>
    public required List<string> FavoritePairs { get; set; }

    /// <summary>
    /// UI preferences
    /// </summary>
    public required UIPreferencesDto UI { get; set; }

    /// <summary>
    /// Last updated timestamp
    /// </summary>
    public DateTimeOffset LastUpdated { get; set; }
}

/// <summary>
/// Chart preferences DTO
/// </summary>
public class ChartPreferencesDto
{
    /// <summary>
    /// Chart type (line, candlestick, bar, area)
    /// </summary>
    public string Type { get; set; } = "line";

    /// <summary>
    /// Time frame (1m, 5m, 15m, 1h, 4h, 1d, etc.)
    /// </summary>
    public string TimeFrame { get; set; } = "1h";

    /// <summary>
    /// Show volume indicator
    /// </summary>
    public bool ShowVolume { get; set; } = true;

    /// <summary>
    /// Show grid lines
    /// </summary>
    public bool ShowGrid { get; set; } = true;

    /// <summary>
    /// Color scheme name
    /// </summary>
    public string ColorScheme { get; set; } = "default";

    public ChartPreferences ToChartPreferences()
    {
        var chartType = Type.ToLowerInvariant() switch
        {
            "line" => ChartType.Line,
            "candlestick" => ChartType.Candlestick,
            "bar" => ChartType.Bar,
            "area" => ChartType.Area,
            _ => ChartType.Line
        };

        return new ChartPreferences(chartType, TimeFrame, ShowVolume, ShowGrid, ColorScheme);
    }

    public static ChartPreferencesDto FromChartPreferences(ChartPreferences chartPreferences)
    {
        return new ChartPreferencesDto
        {
            Type = chartPreferences.Type.ToString().ToLowerInvariant(),
            TimeFrame = chartPreferences.TimeFrame,
            ShowVolume = chartPreferences.ShowVolume,
            ShowGrid = chartPreferences.ShowGrid,
            ColorScheme = chartPreferences.ColorScheme
        };
    }
}

/// <summary>
/// Indicator preference DTO
/// </summary>
public class IndicatorPreferenceDto
{
    /// <summary>
    /// Indicator type
    /// </summary>
    public IndicatorType Type { get; set; }

    /// <summary>
    /// Period for calculation
    /// </summary>
    public int Period { get; set; }

    /// <summary>
    /// Whether indicator is visible
    /// </summary>
    public bool IsVisible { get; set; } = true;

    /// <summary>
    /// Color for the indicator
    /// </summary>
    public string Color { get; set; } = "#007bff";

    /// <summary>
    /// Additional parameters
    /// </summary>
    public Dictionary<string, object> Parameters { get; set; } = new();

    public IndicatorPreference ToIndicatorPreference()
    {
        return new IndicatorPreference(Type, Period, IsVisible, Color, Parameters);
    }

    public static IndicatorPreferenceDto FromIndicatorPreference(IndicatorPreference indicatorPreference)
    {
        return new IndicatorPreferenceDto
        {
            Type = indicatorPreference.Type,
            Period = indicatorPreference.Period,
            IsVisible = indicatorPreference.IsVisible,
            Color = indicatorPreference.Color,
            Parameters = new Dictionary<string, object>(indicatorPreference.Parameters)
        };
    }
}

/// <summary>
/// UI preferences DTO
/// </summary>
public class UIPreferencesDto
{
    /// <summary>
    /// Dark mode enabled
    /// </summary>
    public bool DarkMode { get; set; } = false;

    /// <summary>
    /// Language preference
    /// </summary>
    public string Language { get; set; } = "en";

    /// <summary>
    /// Show advanced features
    /// </summary>
    public bool ShowAdvancedFeatures { get; set; } = false;

    /// <summary>
    /// Refresh interval in milliseconds
    /// </summary>
    public int RefreshInterval { get; set; } = 5000;

    public UIPreferences ToUIPreferences()
    {
        return new UIPreferences(DarkMode, Language, ShowAdvancedFeatures, RefreshInterval);
    }

    public static UIPreferencesDto FromUIPreferences(UIPreferences uiPreferences)
    {
        return new UIPreferencesDto
        {
            DarkMode = uiPreferences.DarkMode,
            Language = uiPreferences.Language,
            ShowAdvancedFeatures = uiPreferences.ShowAdvancedFeatures,
            RefreshInterval = uiPreferences.RefreshInterval
        };
    }
}
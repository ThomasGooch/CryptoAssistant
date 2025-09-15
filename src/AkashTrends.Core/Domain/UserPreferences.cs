using AkashTrends.Core.Analysis.Indicators;

namespace AkashTrends.Core.Domain;

/// <summary>
/// Represents user preferences for charts, indicators, and UI settings
/// </summary>
public class UserPreferences
{
    public string UserId { get; }
    public ChartPreferences Chart { get; private set; }
    public List<IndicatorPreference> Indicators { get; private set; }
    public List<string> FavoritePairs { get; private set; }
    public UIPreferences UI { get; private set; }
    public DateTimeOffset LastUpdated { get; private set; }

    private UserPreferences(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        UserId = userId;
        Chart = ChartPreferences.Default();
        Indicators = new List<IndicatorPreference>();
        FavoritePairs = new List<string>();
        UI = UIPreferences.Default();
        LastUpdated = DateTimeOffset.UtcNow;
    }

    public static UserPreferences Create(string userId)
    {
        return new UserPreferences(userId);
    }

    public void UpdateChartPreferences(ChartPreferences chartPreferences)
    {
        Chart = chartPreferences ?? throw new ArgumentNullException(nameof(chartPreferences));
        LastUpdated = DateTimeOffset.UtcNow;
    }

    public void UpdateIndicators(List<IndicatorPreference> indicators)
    {
        Indicators = indicators ?? throw new ArgumentNullException(nameof(indicators));
        LastUpdated = DateTimeOffset.UtcNow;
    }

    public void UpdateFavoritePairs(List<string> favoritePairs)
    {
        FavoritePairs = favoritePairs ?? throw new ArgumentNullException(nameof(favoritePairs));
        LastUpdated = DateTimeOffset.UtcNow;
    }

    public void UpdateUIPreferences(UIPreferences uiPreferences)
    {
        UI = uiPreferences ?? throw new ArgumentNullException(nameof(uiPreferences));
        LastUpdated = DateTimeOffset.UtcNow;
    }
}

/// <summary>
/// Chart-specific preferences
/// </summary>
public class ChartPreferences
{
    public ChartType Type { get; }
    public string TimeFrame { get; }
    public bool ShowVolume { get; }
    public bool ShowGrid { get; }
    public string ColorScheme { get; }

    public ChartPreferences(ChartType type, string timeFrame, bool showVolume, bool showGrid, string colorScheme)
    {
        Type = type;
        TimeFrame = timeFrame ?? throw new ArgumentNullException(nameof(timeFrame));
        ShowVolume = showVolume;
        ShowGrid = showGrid;
        ColorScheme = colorScheme ?? throw new ArgumentNullException(nameof(colorScheme));
    }

    public static ChartPreferences Default()
    {
        return new ChartPreferences(ChartType.Line, "1h", true, true, "default");
    }
}

/// <summary>
/// Individual indicator preference
/// </summary>
public class IndicatorPreference
{
    public IndicatorType Type { get; }
    public int Period { get; }
    public bool IsVisible { get; }
    public string Color { get; }
    public Dictionary<string, object> Parameters { get; }

    public IndicatorPreference(IndicatorType type, int period, bool isVisible, string color, Dictionary<string, object>? parameters = null)
    {
        Type = type;
        Period = period;
        IsVisible = isVisible;
        Color = color ?? throw new ArgumentNullException(nameof(color));
        Parameters = parameters ?? new Dictionary<string, object>();
    }
}

/// <summary>
/// UI-specific preferences
/// </summary>
public class UIPreferences
{
    public bool DarkMode { get; }
    public string Language { get; }
    public bool ShowAdvancedFeatures { get; }
    public int RefreshInterval { get; }

    public UIPreferences(bool darkMode, string language, bool showAdvancedFeatures, int refreshInterval)
    {
        DarkMode = darkMode;
        Language = language ?? throw new ArgumentNullException(nameof(language));
        ShowAdvancedFeatures = showAdvancedFeatures;
        RefreshInterval = refreshInterval;
    }

    public static UIPreferences Default()
    {
        return new UIPreferences(false, "en", false, 5000);
    }
}

/// <summary>
/// Chart type enumeration
/// </summary>
public enum ChartType
{
    Line,
    Candlestick,
    Bar,
    Area
}
namespace AkashTrends.Core.Analysis.Indicators;

public class IndicatorDescription
{
    public string Name { get; }
    public string ShortName { get; }
    public string Description { get; }

    public IndicatorDescription(string name, string shortName, string description)
    {
        Name = name;
        ShortName = shortName;
        Description = description;
    }
}

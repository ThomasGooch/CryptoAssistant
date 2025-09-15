namespace AkashTrends.Core.Analysis.Indicators;

public class IndicatorResult
{
    public decimal Value { get; }
    public DateTimeOffset StartTime { get; }
    public DateTimeOffset EndTime { get; }
    public IReadOnlyList<decimal> Values { get; }

    public IndicatorResult(decimal value, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        if (endTime < startTime)
        {
            throw new ArgumentException("End time must be after start time", nameof(endTime));
        }

        Value = value;
        StartTime = startTime;
        EndTime = endTime;
        Values = new List<decimal> { value };
    }

    public IndicatorResult(IReadOnlyList<decimal> values, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        if (endTime < startTime)
        {
            throw new ArgumentException("End time must be after start time", nameof(endTime));
        }

        if (values == null || values.Count == 0)
        {
            throw new ArgumentException("Values cannot be null or empty", nameof(values));
        }

        Value = values[values.Count - 1]; // Last value as primary value
        StartTime = startTime;
        EndTime = endTime;
        Values = values;
    }

    /// <summary>
    /// Creates an empty indicator result for error cases
    /// </summary>
    public static IndicatorResult Empty()
    {
        return new IndicatorResult(0m, DateTimeOffset.MinValue, DateTimeOffset.MinValue);
    }

    /// <summary>
    /// Checks if this result is empty (error case)
    /// </summary>
    public bool IsEmpty => StartTime == DateTimeOffset.MinValue && EndTime == DateTimeOffset.MinValue;
}

namespace AkashTrends.Core.Analysis.Indicators;

public class IndicatorResult
{
    public decimal Value { get; }
    public DateTimeOffset StartTime { get; }
    public DateTimeOffset EndTime { get; }

    public IndicatorResult(decimal value, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        if (endTime < startTime)
        {
            throw new ArgumentException("End time must be after start time", nameof(endTime));
        }

        Value = value;
        StartTime = startTime;
        EndTime = endTime;
    }
}

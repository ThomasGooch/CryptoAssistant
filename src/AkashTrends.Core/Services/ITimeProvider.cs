namespace AkashTrends.Core.Services;

/// <summary>
/// Interface for time-related operations
/// </summary>
public interface ITimeProvider
{
    /// <summary>
    /// Gets the current UTC time
    /// </summary>
    /// <returns>Current UTC time as DateTimeOffset</returns>
    DateTimeOffset GetUtcNow();

    /// <summary>
    /// Delays execution for the specified duration
    /// </summary>
    /// <param name="delay">Time to delay</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task Delay(TimeSpan delay, CancellationToken cancellationToken);
}

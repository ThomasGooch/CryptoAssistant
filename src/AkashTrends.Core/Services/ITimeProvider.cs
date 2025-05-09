namespace AkashTrends.Core.Services;

public interface ITimeProvider
{
    Task Delay(TimeSpan delay, CancellationToken cancellationToken);
}

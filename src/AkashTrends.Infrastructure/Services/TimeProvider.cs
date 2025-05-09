using AkashTrends.Core.Services;

namespace AkashTrends.Infrastructure.Services;

public class CryptoTimeProvider : ITimeProvider
{
    public Task Delay(TimeSpan delay, CancellationToken cancellationToken)
    {
        return Task.Delay(delay, cancellationToken);
    }
}

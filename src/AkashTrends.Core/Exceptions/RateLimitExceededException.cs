namespace AkashTrends.Core.Exceptions;

/// <summary>
/// Exception thrown when API rate limits are exceeded
/// </summary>
public class RateLimitExceededException : AkashTrendsException
{
    public RateLimitExceededException(string message) : base(message)
    {
    }

    public RateLimitExceededException(string message, Exception innerException) : base(message, innerException)
    {
    }
}

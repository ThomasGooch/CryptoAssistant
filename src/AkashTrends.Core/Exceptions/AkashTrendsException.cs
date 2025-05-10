namespace AkashTrends.Core.Exceptions;

/// <summary>
/// Base exception for all application-specific exceptions in AkashTrends
/// </summary>
public abstract class AkashTrendsException : Exception
{
    public AkashTrendsException(string message) : base(message)
    {
    }

    public AkashTrendsException(string message, Exception innerException) : base(message, innerException)
    {
    }
}

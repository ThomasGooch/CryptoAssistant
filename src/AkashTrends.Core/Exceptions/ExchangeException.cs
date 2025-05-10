namespace AkashTrends.Core.Exceptions;

/// <summary>
/// Exception thrown when there are issues with crypto exchange operations
/// </summary>
public class ExchangeException : AkashTrendsException
{
    public ExchangeException(string message) : base(message)
    {
    }

    public ExchangeException(string message, Exception innerException) : base(message, innerException)
    {
    }
}

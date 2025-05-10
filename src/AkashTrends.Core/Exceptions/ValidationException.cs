namespace AkashTrends.Core.Exceptions;

/// <summary>
/// Exception thrown when validation fails for domain entities or operations
/// </summary>
public class ValidationException : AkashTrendsException
{
    public ValidationException(string message) : base(message)
    {
    }

    public ValidationException(string message, Exception innerException) : base(message, innerException)
    {
    }
}

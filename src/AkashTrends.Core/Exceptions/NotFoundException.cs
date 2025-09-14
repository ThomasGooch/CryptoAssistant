namespace AkashTrends.Core.Exceptions;

/// <summary>
/// Exception thrown when a requested resource is not found
/// </summary>
public class NotFoundException : AkashTrendsException
{
    public NotFoundException(string message) : base(message)
    {
    }

    public NotFoundException(string message, Exception innerException) : base(message, innerException)
    {
    }

    public static NotFoundException Create<T>(string id) where T : class
    {
        return new NotFoundException($"{typeof(T).Name} with id {id} was not found");
    }
}

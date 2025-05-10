namespace AkashTrends.Application.Common.CQRS;

/// <summary>
/// Marker interface for query objects
/// </summary>
/// <typeparam name="TResult">The type of result returned by the query</typeparam>
public interface IQuery<out TResult>
{
}

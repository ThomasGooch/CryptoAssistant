namespace AkashTrends.Application.Common.CQRS;

/// <summary>
/// Interface for dispatching queries to their appropriate handlers
/// </summary>
public interface IQueryDispatcher
{
    /// <summary>
    /// Dispatches a query to its handler and returns the result
    /// </summary>
    /// <typeparam name="TQuery">The type of query to dispatch</typeparam>
    /// <typeparam name="TResult">The type of result expected from the query</typeparam>
    /// <param name="query">The query to dispatch</param>
    /// <returns>The result of the query</returns>
    Task<TResult> Dispatch<TQuery, TResult>(TQuery query) where TQuery : IQuery<TResult>;
}

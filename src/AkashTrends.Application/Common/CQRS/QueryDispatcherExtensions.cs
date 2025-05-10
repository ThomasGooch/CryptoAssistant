namespace AkashTrends.Application.Common.CQRS;

/// <summary>
/// Extension methods for IQueryDispatcher
/// </summary>
public static class QueryDispatcherExtensions
{
    /// <summary>
    /// Dispatches a query to its handler and returns the result
    /// </summary>
    /// <typeparam name="TResult">The type of result expected from the query</typeparam>
    /// <param name="dispatcher">The query dispatcher</param>
    /// <param name="query">The query to dispatch</param>
    /// <returns>The result of the query</returns>
    public static Task<TResult> Dispatch<TResult>(this IQueryDispatcher dispatcher, IQuery<TResult> query)
    {
        return dispatcher.Dispatch<IQuery<TResult>, TResult>(query);
    }
}

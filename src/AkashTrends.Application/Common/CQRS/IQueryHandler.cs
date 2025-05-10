namespace AkashTrends.Application.Common.CQRS;

/// <summary>
/// Interface for query handlers
/// </summary>
/// <typeparam name="TQuery">The type of query to handle</typeparam>
/// <typeparam name="TResult">The type of result returned by the query</typeparam>
public interface IQueryHandler<in TQuery, TResult> where TQuery : IQuery<TResult>
{
    /// <summary>
    /// Handles the specified query
    /// </summary>
    /// <param name="query">The query to handle</param>
    /// <returns>The result of the query</returns>
    Task<TResult> Handle(TQuery query);
}

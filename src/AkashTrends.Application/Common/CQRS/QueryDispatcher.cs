namespace AkashTrends.Application.Common.CQRS;

/// <summary>
/// Implementation of IQueryDispatcher that resolves handlers from the service provider
/// </summary>
public class QueryDispatcher : IQueryDispatcher
{
    private readonly IServiceProvider _serviceProvider;

    /// <summary>
    /// Initializes a new instance of the QueryDispatcher class
    /// </summary>
    /// <param name="serviceProvider">The service provider to resolve handlers from</param>
    public QueryDispatcher(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
    }

    /// <summary>
    /// Dispatches a query to its handler and returns the result
    /// </summary>
    /// <typeparam name="TQuery">The type of query to dispatch</typeparam>
    /// <typeparam name="TResult">The type of result expected from the query</typeparam>
    /// <param name="query">The query to dispatch</param>
    /// <returns>The result of the query</returns>
    /// <exception cref="InvalidOperationException">Thrown when no handler is found for the query</exception>
    public async Task<TResult> Dispatch<TQuery, TResult>(TQuery query) where TQuery : IQuery<TResult>
    {
        var handlerType = typeof(IQueryHandler<TQuery, TResult>);
        var handler = _serviceProvider.GetService(handlerType);

        if (handler == null)
        {
            throw new InvalidOperationException($"No handler found for query type {typeof(TQuery).Name}");
        }

        return await ((IQueryHandler<TQuery, TResult>)handler).Handle(query);
    }
}

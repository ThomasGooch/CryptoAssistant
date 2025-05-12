using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;

namespace AkashTrends.Application.Features.Crypto.GetHistoricalPrices;

/// <summary>
/// Handler for GetHistoricalPricesQuery
/// </summary>
public class GetHistoricalPricesQueryHandler : IQueryHandler<GetHistoricalPricesQuery, GetHistoricalPricesResult>
{
    private readonly ICryptoExchangeService _exchangeService;

    /// <summary>
    /// Initializes a new instance of the GetHistoricalPricesQueryHandler class
    /// </summary>
    /// <param name="exchangeService">The cryptocurrency exchange service</param>
    public GetHistoricalPricesQueryHandler(ICryptoExchangeService exchangeService)
    {
        _exchangeService = exchangeService ?? throw new ArgumentNullException(nameof(exchangeService));
    }

    /// <summary>
    /// Handles the GetHistoricalPricesQuery and returns the historical prices
    /// </summary>
    /// <param name="query">The query containing the cryptocurrency symbol and time range</param>
    /// <returns>A GetHistoricalPricesResult containing the historical price information</returns>
    /// <exception cref="ValidationException">Thrown when the query parameters are invalid</exception>
    /// <exception cref="ExchangeException">Thrown when there's an issue with the exchange service</exception>
    public async Task<GetHistoricalPricesResult> Handle(GetHistoricalPricesQuery query)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(query.Symbol))
        {
            throw new ValidationException("Symbol cannot be empty");
        }

        if (query.StartTime >= query.EndTime)
        {
            throw new ValidationException("Start time must be before end time");
        }

        // Get historical prices from exchange service
        var prices = await _exchangeService.GetHistoricalPricesAsync(
            query.Symbol, 
            query.StartTime, 
            query.EndTime);

        // Map to result
        var result = new GetHistoricalPricesResult
        {
            Symbol = query.Symbol,
            StartTime = query.StartTime,
            EndTime = query.EndTime,
            Prices = prices.Select(p => new PricePoint
            {
                Price = p.Value,
                Timestamp = p.Timestamp
            }).ToList()
        };

        return result;
    }
}

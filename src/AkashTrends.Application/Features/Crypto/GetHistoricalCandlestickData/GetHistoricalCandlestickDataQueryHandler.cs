using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;

namespace AkashTrends.Application.Features.Crypto.GetHistoricalCandlestickData;

/// <summary>
/// Handler for GetHistoricalCandlestickDataQuery
/// </summary>
public class GetHistoricalCandlestickDataQueryHandler : IQueryHandler<GetHistoricalCandlestickDataQuery, GetHistoricalCandlestickDataResult>
{
    private readonly ICryptoExchangeService _exchangeService;

    /// <summary>
    /// Initializes a new instance of the GetHistoricalCandlestickDataQueryHandler class
    /// </summary>
    /// <param name="exchangeService">The cryptocurrency exchange service</param>
    public GetHistoricalCandlestickDataQueryHandler(ICryptoExchangeService exchangeService)
    {
        _exchangeService = exchangeService ?? throw new ArgumentNullException(nameof(exchangeService));
    }

    /// <summary>
    /// Handles the GetHistoricalCandlestickDataQuery and returns the historical candlestick data
    /// </summary>
    /// <param name="query">The query containing the cryptocurrency symbol and time range</param>
    /// <returns>A GetHistoricalCandlestickDataResult containing the historical candlestick information</returns>
    /// <exception cref="ValidationException">Thrown when the query parameters are invalid</exception>
    /// <exception cref="ExchangeException">Thrown when there's an issue with the exchange service</exception>
    public async Task<GetHistoricalCandlestickDataResult> Handle(GetHistoricalCandlestickDataQuery query)
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

        // Get historical candlestick data from exchange service
        var candlestickData = await _exchangeService.GetHistoricalCandlestickDataAsync(
            query.Symbol,
            query.StartTime,
            query.EndTime);

        // Map to result
        var result = new GetHistoricalCandlestickDataResult
        {
            Symbol = query.Symbol,
            StartTime = query.StartTime,
            EndTime = query.EndTime,
            Data = candlestickData.ToList()
        };

        return result;
    }
}
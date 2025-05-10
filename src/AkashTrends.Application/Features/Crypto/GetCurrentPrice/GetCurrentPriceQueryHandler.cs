using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;

namespace AkashTrends.Application.Features.Crypto.GetCurrentPrice;

/// <summary>
/// Handler for GetCurrentPriceQuery
/// </summary>
public class GetCurrentPriceQueryHandler : IGetCurrentPriceQueryHandler
{
    private readonly ICryptoExchangeService _exchangeService;

    /// <summary>
    /// Initializes a new instance of the GetCurrentPriceQueryHandler class
    /// </summary>
    /// <param name="exchangeService">The cryptocurrency exchange service</param>
    public GetCurrentPriceQueryHandler(ICryptoExchangeService exchangeService)
    {
        _exchangeService = exchangeService ?? throw new ArgumentNullException(nameof(exchangeService));
    }

    /// <summary>
    /// Handles the GetCurrentPriceQuery and returns the current price
    /// </summary>
    /// <param name="query">The query containing the cryptocurrency symbol</param>
    /// <returns>A GetCurrentPriceResult containing the price information</returns>
    /// <exception cref="ValidationException">Thrown when the symbol is invalid</exception>
    /// <exception cref="ExchangeException">Thrown when there's an issue with the exchange service</exception>
    public async Task<GetCurrentPriceResult> Handle(GetCurrentPriceQuery query)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(query.Symbol))
        {
            throw new ValidationException("Symbol cannot be empty");
        }

        // Get price from exchange service
        var price = await _exchangeService.GetCurrentPriceAsync(query.Symbol);

        // Map to result
        return new GetCurrentPriceResult
        {
            Symbol = query.Symbol,
            Price = price.Value,
            Timestamp = price.Timestamp
        };
    }
}

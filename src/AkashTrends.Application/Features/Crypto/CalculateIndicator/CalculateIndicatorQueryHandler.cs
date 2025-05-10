using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;

namespace AkashTrends.Application.Features.Crypto.CalculateIndicator;

/// <summary>
/// Handler for CalculateIndicatorQuery
/// </summary>
public class CalculateIndicatorQueryHandler : ICalculateIndicatorQueryHandler
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;

    /// <summary>
    /// Initializes a new instance of the CalculateIndicatorQueryHandler class
    /// </summary>
    /// <param name="exchangeService">The cryptocurrency exchange service</param>
    /// <param name="indicatorFactory">The technical indicator factory</param>
    public CalculateIndicatorQueryHandler(
        ICryptoExchangeService exchangeService,
        IIndicatorFactory indicatorFactory)
    {
        _exchangeService = exchangeService ?? throw new ArgumentNullException(nameof(exchangeService));
        _indicatorFactory = indicatorFactory ?? throw new ArgumentNullException(nameof(indicatorFactory));
    }

    /// <summary>
    /// Handles the CalculateIndicatorQuery and returns the indicator result
    /// </summary>
    /// <param name="query">The query containing the cryptocurrency symbol and indicator parameters</param>
    /// <returns>A CalculateIndicatorResult containing the calculated indicator value</returns>
    /// <exception cref="ValidationException">Thrown when the query parameters are invalid</exception>
    /// <exception cref="ExchangeException">Thrown when there's an issue with the exchange service</exception>
    public async Task<CalculateIndicatorResult> Handle(CalculateIndicatorQuery query)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(query.Symbol))
        {
            throw new ValidationException("Symbol cannot be empty");
        }

        if (query.Period <= 0)
        {
            throw new ValidationException("Period must be greater than 0");
        }

        // Get historical prices for the indicator period
        var endTime = DateTimeOffset.UtcNow;
        var startTime = endTime.AddDays(-query.Period);
        
        var prices = await _exchangeService.GetHistoricalPricesAsync(
            query.Symbol,
            startTime,
            endTime);

        // Calculate indicator
        var indicator = _indicatorFactory.CreateIndicator(query.Type, query.Period);
        var result = indicator.Calculate(prices);

        // Map to result
        return new CalculateIndicatorResult
        {
            Symbol = query.Symbol,
            Type = query.Type,
            Value = result.Value,
            StartTime = result.StartTime,
            EndTime = result.EndTime
        };
    }
}

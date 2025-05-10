using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.CalculateIndicator;
using AkashTrends.Application.Features.Crypto.GetAvailableIndicators;
using AkashTrends.Application.Features.Crypto.GetCurrentPrice;
using AkashTrends.Application.Features.Crypto.GetHistoricalPrices;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace AkashTrends.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CryptoController : ControllerBase
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ILogger<CryptoController> _logger;
    private readonly IQueryDispatcher _queryDispatcher;

    public CryptoController(
        ICryptoExchangeService exchangeService,
        IIndicatorFactory indicatorFactory,
        ILogger<CryptoController> logger,
        IQueryDispatcher queryDispatcher)
    {
        _exchangeService = exchangeService;
        _indicatorFactory = indicatorFactory;
        _logger = logger;
        _queryDispatcher = queryDispatcher;
    }

    [HttpGet("price/{symbol}")]
    public async Task<ActionResult<CryptoPriceResponse>> GetPrice(string symbol)
    {
        _logger.LogInformation($"Getting current price for {symbol}");

        // Use the query dispatcher to handle the query
        var query = new GetCurrentPriceQuery { Symbol = symbol };
        var result = await _queryDispatcher.Dispatch(query);
        
        _logger.LogInformation($"Retrieved price for {symbol}: {result.Price}");

        return Ok(new CryptoPriceResponse
        {
            Symbol = result.Symbol,
            Price = result.Price,
            Timestamp = result.Timestamp
        });
    }

    [HttpGet("indicator/{symbol}")]
    public async Task<ActionResult<IndicatorResponse>> GetIndicator(
        string symbol,
        [FromQuery] IndicatorType type,
        [FromQuery] int period)
    {
        _logger.LogInformation($"Calculating {type} for {symbol} with period {period}");

        // Use the query dispatcher to handle the query
        var query = new CalculateIndicatorQuery
        {
            Symbol = symbol,
            Type = type,
            Period = period
        };

        var result = await _queryDispatcher.Dispatch(query);
        
        _logger.LogInformation($"Calculated {type} for {symbol}: {result.Value}");

        return Ok(new IndicatorResponse
        {
            Symbol = result.Symbol,
            Type = result.Type,
            Value = result.Value,
            StartTime = result.StartTime,
            EndTime = result.EndTime
        });
    }

    [HttpGet("historical/{symbol}")]
    public async Task<ActionResult<HistoricalPricesResponse>> GetHistoricalPrices(
        string symbol,
        [FromQuery] DateTimeOffset startTime,
        [FromQuery] DateTimeOffset endTime)
    {
        _logger.LogInformation($"Getting historical prices for {symbol} from {startTime} to {endTime}");

        // Use the query dispatcher to handle the query
        var query = new GetHistoricalPricesQuery
        {
            Symbol = symbol,
            StartTime = startTime,
            EndTime = endTime
        };

        var result = await _queryDispatcher.Dispatch(query);
        
        _logger.LogInformation($"Retrieved {result.Prices.Count} historical prices for {symbol}");

        // Map to response model
        var response = new HistoricalPricesResponse
        {
            Symbol = result.Symbol,
            StartTime = result.StartTime,
            EndTime = result.EndTime,
            Prices = result.Prices.Select(p => new Models.PricePoint
            {
                Price = p.Price,
                Timestamp = p.Timestamp
            }).ToList()
        };

        return Ok(response);
    }

    [HttpGet("indicators")]
    public async Task<ActionResult<IndicatorTypesResponse>> GetAvailableIndicators()
    {
        _logger.LogInformation($"Getting available indicators");

        // Use the query dispatcher to handle the query
        var query = new GetAvailableIndicatorsQuery();
        var result = await _queryDispatcher.Dispatch(query);
        
        _logger.LogInformation($"Retrieved available indicators");

        return Ok(new IndicatorTypesResponse
        {
            Indicators = result.Indicators
        });
    }


}

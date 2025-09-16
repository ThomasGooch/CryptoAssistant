using AkashTrends.API.Models;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.CalculateIndicator;
using AkashTrends.Application.Features.Crypto.GetAvailableIndicators;
using AkashTrends.Application.Features.Crypto.GetCurrentPrice;
using AkashTrends.Application.Features.Crypto.GetHistoricalPrices;
using AkashTrends.Application.Features.Crypto.GetHistoricalCandlestickData;
using AkashTrends.Application.Features.Crypto.CalculateMultiTimeframeIndicators;
using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;

namespace AkashTrends.API.Controllers;

/// <summary>
/// Cryptocurrency data and analysis endpoints
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
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

    /// <summary>
    /// Get current price for a cryptocurrency symbol
    /// </summary>
    /// <param name="symbol">The cryptocurrency symbol (e.g., BTC-USD)</param>
    /// <returns>Current price information</returns>
    /// <response code="200">Returns the current price data</response>
    /// <response code="400">Invalid symbol provided</response>
    /// <response code="404">Symbol not found</response>
    [HttpGet("price/{symbol}")]
    [ProducesResponseType(typeof(CryptoPriceResponse), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<CryptoPriceResponse>> GetPrice([Required] string symbol)
    {
        _logger.LogInformation($"Getting current price for {symbol}");

        // Use the query dispatcher to handle the query
        var query = new GetCurrentPriceQuery { Symbol = symbol };
        var result = await _queryDispatcher.Dispatch<GetCurrentPriceQuery, GetCurrentPriceResult>(query);

        _logger.LogInformation($"Retrieved price for {symbol}: {result.Price}");

        return Ok(new CryptoPriceResponse
        {
            Symbol = result.Symbol,
            Price = result.Price,
            Timestamp = result.Timestamp
        });
    }

    /// <summary>
    /// Calculate technical indicator for a cryptocurrency symbol
    /// </summary>
    /// <param name="symbol">The cryptocurrency symbol (e.g., BTC-USD)</param>
    /// <param name="type">The type of technical indicator to calculate</param>
    /// <param name="period">The period for the indicator calculation</param>
    /// <returns>Calculated indicator result</returns>
    /// <response code="200">Returns the calculated indicator data</response>
    /// <response code="400">Invalid parameters provided</response>
    /// <response code="404">Symbol not found</response>
    [HttpGet("indicator/{symbol}")]
    [ProducesResponseType(typeof(IndicatorResponse), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<IndicatorResponse>> GetIndicator(
        [Required] string symbol,
        [FromQuery, Required] IndicatorType type,
        [FromQuery, Required, Range(1, 200)] int period)
    {
        _logger.LogInformation($"Calculating {type} for {symbol} with period {period}");

        // Use the query dispatcher to handle the query
        var query = new CalculateIndicatorQuery
        {
            Symbol = symbol,
            Type = type,
            Period = period
        };

        var result = await _queryDispatcher.Dispatch<CalculateIndicatorQuery, CalculateIndicatorResult>(query);

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

    /// <summary>
    /// Get historical prices for a cryptocurrency symbol
    /// </summary>
    /// <param name="symbol">The cryptocurrency symbol (e.g., BTC-USD)</param>
    /// <param name="startTime">Start time for historical data</param>
    /// <param name="endTime">End time for historical data</param>
    /// <returns>Historical price data</returns>
    /// <response code="200">Returns the historical price data</response>
    /// <response code="400">Invalid date range or symbol provided</response>
    /// <response code="404">Symbol not found</response>
    [HttpGet("historical/{symbol}")]
    [ProducesResponseType(typeof(HistoricalPricesResponse), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<HistoricalPricesResponse>> GetHistoricalPrices(
        [Required] string symbol,
        [FromQuery, Required] DateTimeOffset startTime,
        [FromQuery, Required] DateTimeOffset endTime)
    {
        _logger.LogInformation($"Getting historical prices for {symbol} from {startTime} to {endTime}");

        // Use the query dispatcher to handle the query
        var query = new GetHistoricalPricesQuery
        {
            Symbol = symbol,
            StartTime = startTime,
            EndTime = endTime
        };

        var result = await _queryDispatcher.Dispatch<GetHistoricalPricesQuery, GetHistoricalPricesResult>(query);

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

    /// <summary>
    /// Get all available technical indicators
    /// </summary>
    /// <returns>List of available indicator types</returns>
    /// <response code="200">Returns the list of available indicators</response>
    [HttpGet("indicators")]
    [ProducesResponseType(typeof(IndicatorTypesResponse), 200)]
    public async Task<ActionResult<IndicatorTypesResponse>> GetAvailableIndicators()
    {
        _logger.LogInformation($"Getting available indicators");

        // Use the query dispatcher to handle the query
        var query = new GetAvailableIndicatorsQuery();
        var result = await _queryDispatcher.Dispatch<GetAvailableIndicatorsQuery, GetAvailableIndicatorsResult>(query);

        _logger.LogInformation($"Retrieved available indicators");

        return Ok(new IndicatorTypesResponse
        {
            Indicators = result.Indicators
        });
    }

    /// <summary>
    /// Get historical candlestick data for a cryptocurrency symbol
    /// </summary>
    /// <param name="symbol">The cryptocurrency symbol (e.g., BTC-USD)</param>
    /// <param name="startTime">Start time for historical data</param>
    /// <param name="endTime">End time for historical data</param>
    /// <returns>Historical candlestick data</returns>
    /// <response code="200">Returns the historical candlestick data</response>
    /// <response code="400">Invalid date range or symbol provided</response>
    /// <response code="404">Symbol not found</response>
    [HttpGet("candlestick/{symbol}")]
    [ProducesResponseType(typeof(HistoricalCandlestickResponse), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<HistoricalCandlestickResponse>> GetHistoricalCandlestickData(
        [Required] string symbol,
        [FromQuery, Required] DateTimeOffset startTime,
        [FromQuery, Required] DateTimeOffset endTime)
    {
        _logger.LogInformation($"Getting historical candlestick data for {symbol} from {startTime} to {endTime}");

        // Use the query dispatcher to handle the query
        var query = new GetHistoricalCandlestickDataQuery
        {
            Symbol = symbol,
            StartTime = startTime,
            EndTime = endTime
        };

        var result = await _queryDispatcher.Dispatch<GetHistoricalCandlestickDataQuery, GetHistoricalCandlestickDataResult>(query);

        _logger.LogInformation($"Retrieved {result.Data.Count} candlestick data points for {symbol}");

        // Map to response model
        var response = new HistoricalCandlestickResponse
        {
            Symbol = result.Symbol,
            StartTime = result.StartTime,
            EndTime = result.EndTime,
            Data = result.Data.Select(c => new CandlestickDataResponse
            {
                Timestamp = c.Timestamp,
                Open = c.Open,
                High = c.High,
                Low = c.Low,
                Close = c.Close,
                Volume = c.Volume
            }).ToList()
        };

        return Ok(response);
    }

    /// <summary>
    /// Calculate indicators across multiple timeframes for advanced analysis
    /// </summary>
    /// <param name="symbol">The cryptocurrency symbol (e.g., BTC-USD)</param>
    /// <param name="timeframes">Comma-separated list of timeframes (e.g., FiveMinutes,Hour,Day)</param>
    /// <param name="type">The type of technical indicator to calculate</param>
    /// <param name="period">The period for the indicator calculation</param>
    /// <param name="startTime">Optional start time for data range</param>
    /// <param name="endTime">Optional end time for data range</param>
    /// <returns>Multi-timeframe indicator analysis</returns>
    /// <response code="200">Returns the multi-timeframe indicator analysis</response>
    /// <response code="400">Invalid parameters provided</response>
    /// <response code="404">Symbol not found</response>
    [HttpGet("multi-timeframe/{symbol}")]
    [ProducesResponseType(typeof(MultiTimeframeIndicatorResponse), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<MultiTimeframeIndicatorResponse>> GetMultiTimeframeIndicators(
        [Required] string symbol,
        [FromQuery, Required] string timeframes,
        [FromQuery, Required] IndicatorType type,
        [FromQuery, Required, Range(1, 200)] int period,
        [FromQuery] DateTimeOffset? startTime = null,
        [FromQuery] DateTimeOffset? endTime = null)
    {
        _logger.LogInformation($"Calculating multi-timeframe {type} for {symbol} with period {period} across timeframes {timeframes}");

        // Parse timeframes from comma-separated string
        var timeframeList = new List<Timeframe>();
        try
        {
            var timeframeStrings = timeframes.Split(',', StringSplitOptions.RemoveEmptyEntries);
            foreach (var tf in timeframeStrings)
            {
                if (Enum.TryParse<Timeframe>(tf.Trim(), true, out var timeframe))
                {
                    timeframeList.Add(timeframe);
                }
                else
                {
                    return BadRequest($"Invalid timeframe: {tf}");
                }
            }
        }
        catch (Exception)
        {
            return BadRequest("Invalid timeframes format. Use comma-separated values like 'FiveMinutes,Hour,Day'");
        }

        if (!timeframeList.Any())
        {
            return BadRequest("At least one valid timeframe must be specified");
        }

        // Use the query dispatcher to handle the query
        var query = new CalculateMultiTimeframeIndicatorsQuery
        {
            Symbol = symbol,
            Timeframes = timeframeList,
            IndicatorType = type,
            Period = period,
            StartTime = startTime,
            EndTime = endTime
        };

        var result = await _queryDispatcher.Dispatch<CalculateMultiTimeframeIndicatorsQuery, CalculateMultiTimeframeIndicatorsResult>(query);

        _logger.LogInformation($"Calculated multi-timeframe {type} for {symbol} with alignment score {result.Alignment.AlignmentScore}");

        // Map to response model
        var response = new MultiTimeframeIndicatorResponse
        {
            Symbol = result.Symbol,
            IndicatorType = result.IndicatorType,
            Period = result.Period,
            Results = result.IndicatorResults.ToDictionary(
                kvp => kvp.Key,
                kvp => new TimeframeIndicatorResult
                {
                    Value = kvp.Value.Value,
                    StartTime = kvp.Value.StartTime,
                    EndTime = kvp.Value.EndTime
                }
            ),
            Alignment = new TimeframeAlignmentResponse
            {
                AlignmentScore = result.Alignment.AlignmentScore,
                TrendDirection = result.Alignment.TrendDirection,
                IndicatorValues = result.Alignment.IndicatorValues,
                StrongestTimeframe = result.Alignment.StrongestTimeframe,
                WeakestTimeframe = result.Alignment.WeakestTimeframe,
                ConfluenceStrength = result.Alignment.GetConfluenceStrength(),
                IsStrongConfluence = result.Alignment.IsStrongConfluence()
            },
            StartTime = result.StartTime,
            EndTime = result.EndTime
        };

        return Ok(response);
    }

}

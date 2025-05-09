using AkashTrends.API.Models;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace AkashTrends.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CryptoController : ControllerBase
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;

    public CryptoController(
        ICryptoExchangeService exchangeService,
        IIndicatorFactory indicatorFactory)
    {
        _exchangeService = exchangeService;
        _indicatorFactory = indicatorFactory;
    }

    [HttpGet("price/{symbol}")]
    public async Task<ActionResult<CryptoPriceResponse>> GetPrice(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest("Symbol cannot be empty");
        }

        var price = await _exchangeService.GetCurrentPriceAsync(symbol);

        return Ok(new CryptoPriceResponse
        {
            Symbol = symbol,
            Price = price.Value,
            Timestamp = price.Timestamp
        });
    }

    [HttpGet("indicator/{symbol}")]
    public async Task<ActionResult<IndicatorResponse>> GetIndicator(
        string symbol,
        [FromQuery] IndicatorType type,
        [FromQuery] int period)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest("Symbol cannot be empty");
        }

        if (period <= 0)
        {
            return BadRequest("Period must be greater than 0");
        }

        // Get historical prices for the indicator period
        var endTime = DateTimeOffset.UtcNow;
        var startTime = endTime.AddDays(-period);
        var prices = await _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Calculate indicator
        var indicator = _indicatorFactory.CreateIndicator(type, period);
        var result = indicator.Calculate(prices);

        return Ok(new IndicatorResponse
        {
            Symbol = symbol,
            Type = type,
            Value = result.Value,
            StartTime = result.StartTime,
            EndTime = result.EndTime
        });
    }

    [HttpGet("indicators")]
    public ActionResult<IndicatorTypesResponse> GetAvailableIndicators()
    {
        var indicators = _indicatorFactory.GetAvailableIndicators();
        return Ok(new IndicatorTypesResponse
        {
            Indicators = indicators
        });
    }

    [HttpGet("test-auth")]
    public async Task<ActionResult<object>> TestAuth()
    {
        try
        {
            // Try to get BTC account info as a simple auth test
            var response = await _exchangeService.GetCurrentPriceAsync("BTC");
            return Ok(new 
            { 
                status = "success",
                message = "Authentication successful",
                timestamp = DateTimeOffset.UtcNow,
                testData = response
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new 
            { 
                status = "error",
                message = "Authentication failed",
                error = ex.Message,
                innerError = ex.InnerException?.Message
            });
        }
    }
}

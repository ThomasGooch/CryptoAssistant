using AkashTrends.API.Models;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Exceptions;
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
            throw new ValidationException("Symbol cannot be empty");
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
            throw new ValidationException("Symbol cannot be empty");
        }

        if (period <= 0)
        {
            throw new ValidationException("Period must be greater than 0");
        }

        Console.WriteLine($"Getting historical prices for {symbol} from {DateTimeOffset.UtcNow.AddDays(-period)} to {DateTimeOffset.UtcNow}");

        // Get historical prices for the indicator period
        var endTime = DateTimeOffset.UtcNow;
        var startTime = endTime.AddDays(-period);
        var prices = await _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime);

        Console.WriteLine($"Retrieved {prices.Count} historical prices");

        // Calculate indicator
        var indicator = _indicatorFactory.CreateIndicator(type, period);
        var result = indicator.Calculate(prices);

        Console.WriteLine($"Calculated {type} with value {result.Value}");

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
}

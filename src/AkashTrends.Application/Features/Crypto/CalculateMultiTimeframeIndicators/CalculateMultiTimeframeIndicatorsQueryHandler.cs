using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Analysis.MultiTimeframe;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;

namespace AkashTrends.Application.Features.Crypto.CalculateMultiTimeframeIndicators;

public class CalculateMultiTimeframeIndicatorsQueryHandler 
    : IQueryHandler<CalculateMultiTimeframeIndicatorsQuery, CalculateMultiTimeframeIndicatorsResult>
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IMultiTimeframeIndicatorService _multiTimeframeService;
    private readonly ILogger<CalculateMultiTimeframeIndicatorsQueryHandler> _logger;

    public CalculateMultiTimeframeIndicatorsQueryHandler(
        ICryptoExchangeService exchangeService,
        IMultiTimeframeIndicatorService multiTimeframeService,
        ILogger<CalculateMultiTimeframeIndicatorsQueryHandler> logger)
    {
        _exchangeService = exchangeService;
        _multiTimeframeService = multiTimeframeService;
        _logger = logger;
    }

    public async Task<CalculateMultiTimeframeIndicatorsResult> Handle(CalculateMultiTimeframeIndicatorsQuery query)
    {
        _logger.LogInformation("Calculating multi-timeframe {IndicatorType} for {Symbol} across {TimeframeCount} timeframes", 
            query.IndicatorType, query.Symbol, query.Timeframes.Count());

        // Get historical candlestick data for the finest timeframe
        // We need enough data to aggregate to all requested timeframes
        var endTime = query.EndTime ?? DateTimeOffset.UtcNow;
        var startTime = query.StartTime ?? endTime.AddDays(-30); // Default to 30 days of data

        var candlestickData = await _exchangeService.GetHistoricalCandlestickDataAsync(
            query.Symbol, startTime, endTime);

        if (!candlestickData.Any())
        {
            throw new InvalidOperationException($"No candlestick data available for {query.Symbol}");
        }

        // Calculate indicators across multiple timeframes
        var results = _multiTimeframeService.CalculateMultiTimeframeIndicators(
            query.Symbol,
            candlestickData,
            query.Timeframes,
            query.IndicatorType,
            query.Period);

        // Analyze timeframe alignment
        var alignment = _multiTimeframeService.GetTimeframeAlignment(results);

        _logger.LogInformation("Calculated multi-timeframe {IndicatorType} for {Symbol} with alignment score {AlignmentScore}", 
            query.IndicatorType, query.Symbol, alignment.AlignmentScore);

        return new CalculateMultiTimeframeIndicatorsResult
        {
            Symbol = query.Symbol,
            IndicatorType = query.IndicatorType,
            Period = query.Period,
            IndicatorResults = results,
            Alignment = alignment,
            StartTime = startTime,
            EndTime = endTime
        };
    }
}
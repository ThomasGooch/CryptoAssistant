using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Cache;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Services;

namespace AkashTrends.Infrastructure.Services;

/// <summary>
/// Cached implementation of indicator calculations
/// </summary>
public class CachedIndicatorService : IIndicatorService
{
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ICryptoExchangeService _exchangeService;
    private readonly ICacheService _cacheService;
    private readonly ITimeProvider _timeProvider;
    private const int INDICATOR_CACHE_MINUTES = 30; // Cache indicator results for 30 minutes

    public CachedIndicatorService(
        IIndicatorFactory indicatorFactory,
        ICryptoExchangeService exchangeService,
        ICacheService cacheService,
        ITimeProvider timeProvider)
    {
        _indicatorFactory = indicatorFactory ?? throw new ArgumentNullException(nameof(indicatorFactory));
        _exchangeService = exchangeService ?? throw new ArgumentNullException(nameof(exchangeService));
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    }

    public async Task<IndicatorResult> CalculateIndicatorAsync(
        string symbol,
        IndicatorType type,
        int period,
        DateTimeOffset startTime,
        DateTimeOffset endTime)
    {
        if (startTime >= endTime)
        {
            throw new ArgumentException("Start time must be before end time");
        }

        var cacheKey = $"indicator_{symbol}_{type}_{period}_{startTime:yyyyMMddHHmm}_{endTime:yyyyMMddHHmm}";

        return await _cacheService.GetOrSetAsync(
            cacheKey,
            async () =>
            {
                // Get historical prices
                var prices = await _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime);

                // Create and calculate indicator
                var indicator = _indicatorFactory.CreateIndicator(type, period);
                return indicator.Calculate(prices);
            },
            TimeSpan.FromMinutes(INDICATOR_CACHE_MINUTES));
    }
}

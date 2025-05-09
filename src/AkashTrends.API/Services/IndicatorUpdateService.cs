using AkashTrends.API.Hubs;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace AkashTrends.API.Services;

public class IndicatorUpdateService : IIndicatorUpdateService
{
    private readonly IHubContext<PriceUpdateHub> _hubContext;
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly ILogger<IndicatorUpdateService> _logger;
    private readonly Dictionary<string, List<IndicatorSubscription>> _subscriptions;

    public IndicatorUpdateService(
        IHubContext<PriceUpdateHub> hubContext,
        ICryptoExchangeService exchangeService,
        IIndicatorFactory indicatorFactory,
        ILogger<IndicatorUpdateService> logger)
    {
        _hubContext = hubContext;
        _exchangeService = exchangeService;
        _indicatorFactory = indicatorFactory;
        _logger = logger;
        _subscriptions = new Dictionary<string, List<IndicatorSubscription>>(StringComparer.OrdinalIgnoreCase);
    }

    public Task SubscribeToIndicator(string symbol, IndicatorType indicatorType, int period)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        if (period <= 0)
        {
            throw new ArgumentException("Period must be greater than 0", nameof(period));
        }

        if (!_subscriptions.TryGetValue(symbol, out var indicators))
        {
            indicators = new List<IndicatorSubscription>();
            _subscriptions[symbol] = indicators;
        }

        // Check if this indicator is already subscribed
        if (!indicators.Any(i => i.Type == indicatorType && i.Period == period))
        {
            indicators.Add(new IndicatorSubscription(indicatorType, period));
        }

        return Task.CompletedTask;
    }

    public Task UnsubscribeFromIndicator(string symbol, IndicatorType indicatorType)
    {
        if (_subscriptions.TryGetValue(symbol, out var indicators))
        {
            indicators.RemoveAll(i => i.Type == indicatorType);
            
            // Remove symbol if no indicators are subscribed
            if (indicators.Count == 0)
            {
                _subscriptions.Remove(symbol);
            }
        }

        return Task.CompletedTask;
    }

    // For testing purposes
    internal async Task UpdateIndicatorsForTestingAsync()
    {
        await UpdateIndicatorsAsync();
    }

    public async Task UpdateIndicatorsAsync()
    {
        foreach (var (symbol, indicators) in _subscriptions.ToList())
        {
            foreach (var indicator in indicators.ToList())
            {
                try
                {
                    // Get historical prices for the indicator period
                    var endTime = DateTimeOffset.UtcNow;
                    var startTime = endTime.AddDays(-indicator.Period);
                    var prices = await _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime);

                    // Calculate indicator
                    var calculatedIndicator = _indicatorFactory.CreateIndicator(indicator.Type, indicator.Period);
                    var result = calculatedIndicator.Calculate(prices);

                    // Broadcast the result
                    await _hubContext.Clients.All.SendAsync(
                        "ReceiveIndicatorUpdate",
                        symbol,
                        indicator.Type,
                        result.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to calculate indicator {IndicatorType} for symbol {Symbol}", 
                        indicator.Type, symbol);
                }
            }
        }
    }

    private class IndicatorSubscription
    {
        public IndicatorType Type { get; }
        public int Period { get; }

        public IndicatorSubscription(IndicatorType type, int period)
        {
            Type = type;
            Period = period;
        }
    }
}

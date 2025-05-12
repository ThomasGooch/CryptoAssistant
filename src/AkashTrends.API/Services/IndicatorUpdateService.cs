using AkashTrends.API.Hubs;
using AkashTrends.Core.Analysis;
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
    private readonly Dictionary<string, DateTimeOffset> _lastUpdateTimes = new();
    private readonly TimeSpan _minUpdateInterval = TimeSpan.FromSeconds(30); // Minimum time between updates for the same indicator

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
        return SubscribeToIndicator(symbol, indicatorType, period, Timeframe.Hour);
    }

    public Task SubscribeToIndicator(string symbol, IndicatorType indicatorType, int period, Timeframe timeframe)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        if (period <= 0)
        {
            throw new ArgumentException("Period must be greater than 0", nameof(period));
        }

        if (!Enum.IsDefined(typeof(Timeframe), timeframe))
        {
            throw new ArgumentException($"Invalid timeframe: {timeframe}", nameof(timeframe));
        }

        if (!_subscriptions.TryGetValue(symbol, out var indicators))
        {
            indicators = new List<IndicatorSubscription>();
            _subscriptions[symbol] = indicators;
        }

        // Check if this indicator is already subscribed with this timeframe
        if (!indicators.Any(i => i.Type == indicatorType && i.Period == period && i.Timeframe == timeframe))
        {
            indicators.Add(new IndicatorSubscription(indicatorType, period, timeframe));
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

    public Task UnsubscribeFromIndicator(string symbol, IndicatorType indicatorType, Timeframe timeframe)
    {
        if (_subscriptions.TryGetValue(symbol, out var indicators))
        {
            indicators.RemoveAll(i => i.Type == indicatorType && i.Timeframe == timeframe);
            
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
        var now = DateTimeOffset.UtcNow;
        foreach (var (symbol, indicators) in _subscriptions.ToList())
        {
            // Check if we should update this symbol's indicators
            if (_lastUpdateTimes.TryGetValue(symbol, out var lastUpdate) &&
                (now - lastUpdate) < _minUpdateInterval)
            {
                continue;
            }
            foreach (var indicator in indicators.ToList())
            {
                try
                {
                    // Get historical prices for the indicator period, adjusted for timeframe
                    var endTime = DateTimeOffset.UtcNow;
                    var startTime = CalculateStartTime(endTime, indicator.Period, indicator.Timeframe);
                    var prices = await _exchangeService.GetHistoricalPricesAsync(symbol, startTime, endTime);

                    // Calculate indicator
                    var calculatedIndicator = _indicatorFactory.CreateIndicator(indicator.Type, indicator.Period);
                    var result = calculatedIndicator.Calculate(prices);

                    // Broadcast the result with timeframe information
                    await _hubContext.Clients.All.SendAsync(
                        "ReceiveIndicatorUpdate",
                        symbol,
                        indicator.Type,
                        result.Value,
                        indicator.Timeframe);

                    _lastUpdateTimes[symbol] = now;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to calculate indicator {IndicatorType} for symbol {Symbol} with timeframe {Timeframe}", 
                        indicator.Type, symbol, indicator.Timeframe);
                }
            }
        }
    }

    private DateTimeOffset CalculateStartTime(DateTimeOffset endTime, int period, Timeframe timeframe)
    {
        // Calculate how far back we need to go based on the timeframe and period
        // Add some buffer to ensure we have enough data (2x the period)
        int bufferMultiplier = 2;
        int minutesToSubtract = (int)timeframe * period * bufferMultiplier;
        
        return endTime.AddMinutes(-minutesToSubtract);
    }

    private class IndicatorSubscription
    {
        public IndicatorType Type { get; }
        public int Period { get; }
        public Timeframe Timeframe { get; }

        public IndicatorSubscription(IndicatorType type, int period, Timeframe timeframe = Timeframe.Hour)
        {
            Type = type;
            Period = period;
            Timeframe = timeframe;
        }
    }
}

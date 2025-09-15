using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Services;
using AkashTrends.Application.Common.CQRS;
using AkashTrends.Application.Features.Crypto.CalculateIndicator;
using Microsoft.AspNetCore.SignalR;

namespace AkashTrends.API.Hubs;

public class PriceUpdateHub : Hub
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorUpdateService _indicatorService;
    private readonly IQueryDispatcher _queryDispatcher;

    public PriceUpdateHub(
        ICryptoExchangeService exchangeService,
        IIndicatorUpdateService indicatorService,
        IQueryDispatcher queryDispatcher)
    {
        _exchangeService = exchangeService;
        _indicatorService = indicatorService;
        _queryDispatcher = queryDispatcher;
    }

    private readonly Dictionary<string, HashSet<string>> _symbolSubscriptions = new();
    private readonly Dictionary<string, HashSet<string>> _indicatorSubscriptions = new();

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Clean up subscriptions when client disconnects
        var connectionId = Context.ConnectionId;

        // Clean up symbol subscriptions
        foreach (var symbol in _symbolSubscriptions.Keys.ToList())
        {
            _symbolSubscriptions[symbol].Remove(connectionId);
            if (_symbolSubscriptions[symbol].Count == 0)
            {
                _symbolSubscriptions.Remove(symbol);
            }
        }

        // Clean up indicator subscriptions
        foreach (var key in _indicatorSubscriptions.Keys.ToList())
        {
            _indicatorSubscriptions[key].Remove(connectionId);
            if (_indicatorSubscriptions[key].Count == 0)
            {
                var parts = key.Split('_');
                if (parts.Length == 3)
                {
                    var symbol = parts[0];
                    var indicatorType = Enum.Parse<IndicatorType>(parts[1]);
                    var period = int.Parse(parts[2]);
                    await _indicatorService.UnsubscribeFromIndicator(symbol, indicatorType);
                }
                _indicatorSubscriptions.Remove(key);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SubscribeToSymbol(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        try
        {
            symbol = symbol.ToUpperInvariant().Trim();
            var connectionId = Context.ConnectionId;

            // Add to subscriptions
            if (!_symbolSubscriptions.ContainsKey(symbol))
            {
                _symbolSubscriptions[symbol] = new HashSet<string>();
            }
            _symbolSubscriptions[symbol].Add(connectionId);

            var price = await _exchangeService.GetCurrentPriceAsync(symbol);
            await Clients.Caller.SendAsync("ReceivePriceUpdate", symbol, price.Value);
        }
        catch (Exception ex)
        {
            throw new HubException($"Error subscribing to symbol {symbol}: {ex.Message}");
        }
    }

    public async Task SubscribeToAlerts(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User ID cannot be empty", nameof(userId));
        }

        try
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        catch (Exception ex)
        {
            throw new HubException($"Error subscribing to alerts for user {userId}: {ex.Message}");
        }
    }

    public async Task UnsubscribeFromAlerts(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User ID cannot be empty", nameof(userId));
        }

        try
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        catch (Exception ex)
        {
            throw new HubException($"Error unsubscribing from alerts for user {userId}: {ex.Message}");
        }
    }

    public async Task UnsubscribeFromSymbol(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        symbol = symbol.ToUpperInvariant().Trim();
        var connectionId = Context.ConnectionId;

        if (_symbolSubscriptions.ContainsKey(symbol))
        {
            _symbolSubscriptions[symbol].Remove(connectionId);
            if (_symbolSubscriptions[symbol].Count == 0)
            {
                _symbolSubscriptions.Remove(symbol);
            }
        }

        await Task.CompletedTask;
    }

    public async Task SubscribeToIndicator(string symbol, IndicatorType indicatorType, int period)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        if (period <= 0)
        {
            throw new ArgumentException("Period must be greater than 0", nameof(period));
        }

        try
        {
            symbol = symbol.ToUpperInvariant().Trim();
            var connectionId = Context.ConnectionId;
            var subscriptionKey = $"{symbol}_{indicatorType}_{period}";

            // Add to subscriptions
            if (!_indicatorSubscriptions.ContainsKey(subscriptionKey))
            {
                _indicatorSubscriptions[subscriptionKey] = new HashSet<string>();
            }
            _indicatorSubscriptions[subscriptionKey].Add(connectionId);

            // Calculate initial value using query dispatcher
            var query = new CalculateIndicatorQuery
            {
                Symbol = symbol,
                Type = indicatorType,
                Period = period
            };
            var result = await _queryDispatcher.Dispatch<CalculateIndicatorQuery, CalculateIndicatorResult>(query);

            // Send initial value to caller
            await Clients.Caller.SendAsync("ReceiveIndicatorUpdate", symbol, indicatorType, result.Value);

            // Subscribe for real-time updates
            await _indicatorService.SubscribeToIndicator(symbol, indicatorType, period);
            await _indicatorService.UpdateIndicatorsAsync();
        }
        catch (Exception ex)
        {
            throw new HubException($"Error subscribing to indicator for {symbol}: {ex.Message}");
        }
    }

    public async Task SubscribeToIndicatorWithTimeframe(string symbol, IndicatorType indicatorType, int period, Timeframe timeframe)
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

        await _indicatorService.SubscribeToIndicator(symbol, indicatorType, period, timeframe);
        // Trigger immediate calculation
        await _indicatorService.UpdateIndicatorsAsync();
    }

    public async Task UnsubscribeFromIndicator(string symbol, IndicatorType indicatorType)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        await _indicatorService.UnsubscribeFromIndicator(symbol.ToUpperInvariant().Trim(), indicatorType);
    }

    public async Task UnsubscribeFromIndicatorWithTimeframe(string symbol, IndicatorType indicatorType, Timeframe timeframe)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        if (!Enum.IsDefined(typeof(Timeframe), timeframe))
        {
            throw new ArgumentException($"Invalid timeframe: {timeframe}", nameof(timeframe));
        }

        await _indicatorService.UnsubscribeFromIndicator(symbol.ToUpperInvariant().Trim(), indicatorType, timeframe);
    }
}

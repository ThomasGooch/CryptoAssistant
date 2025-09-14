using AkashTrends.API.Hubs;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.SignalR;

namespace AkashTrends.API.Services;

public class PriceUpdateService : BackgroundService
{
    private readonly IHubContext<PriceUpdateHub> _hubContext;
    private readonly ICryptoExchangeService _exchangeService;
    private readonly ITimeProvider _timeProvider;
    private readonly IIndicatorUpdateService _indicatorService;
    private readonly ILogger<PriceUpdateService> _logger;
    private readonly HashSet<string> _subscribedSymbols;
    private readonly TimeSpan _updateInterval = TimeSpan.FromSeconds(30);
    private readonly TimeSpan _minUpdateInterval = TimeSpan.FromSeconds(30); // Minimum time between updates for the same symbol
    private readonly Dictionary<string, DateTimeOffset> _lastUpdateTimes = new();

    public PriceUpdateService(
        IHubContext<PriceUpdateHub> hubContext,
        ICryptoExchangeService exchangeService,
        ITimeProvider timeProvider,
        IIndicatorUpdateService indicatorService,
        ILogger<PriceUpdateService> logger)
    {
        _hubContext = hubContext;
        _exchangeService = exchangeService;
        _timeProvider = timeProvider;
        _indicatorService = indicatorService;
        _logger = logger;
        _subscribedSymbols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    }

    public Task SubscribeToSymbol(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        _subscribedSymbols.Add(symbol);
        return Task.CompletedTask;
    }

    public Task UnsubscribeFromSymbol(string symbol)
    {
        _subscribedSymbols.Remove(symbol);
        return Task.CompletedTask;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await UpdatePricesAsync();
            await _timeProvider.Delay(_updateInterval, stoppingToken);
        }
    }

    // For testing purposes
    internal Task UpdatePricesForTestingAsync()
    {
        return UpdatePricesAsync();
    }

    private async Task UpdatePricesAsync()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var symbol in _subscribedSymbols.ToList())
        {
            // Check if we should update this symbol
            if (_lastUpdateTimes.TryGetValue(symbol, out var lastUpdate) &&
                (now - lastUpdate) < _minUpdateInterval)
            {
                continue;
            }
            try
            {
                var price = await _exchangeService.GetCurrentPriceAsync(symbol);
                await _hubContext.Clients.All.SendAsync(
                    "ReceivePriceUpdate",
                    symbol,
                    price.Value);

                _lastUpdateTimes[symbol] = now;

                // Trigger indicator updates when price changes
                await _indicatorService.UpdateIndicatorsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update price for symbol {Symbol}", symbol);
            }
        }
    }
}

using AkashTrends.Core.Analysis;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Services;
using Microsoft.AspNetCore.SignalR;

namespace AkashTrends.API.Hubs;

public class PriceUpdateHub : Hub
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorUpdateService _indicatorService;

    public PriceUpdateHub(
        ICryptoExchangeService exchangeService,
        IIndicatorUpdateService indicatorService)
    {
        _exchangeService = exchangeService;
        _indicatorService = indicatorService;
    }

    public async Task SubscribeToSymbol(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Symbol cannot be empty", nameof(symbol));
        }

        var price = await _exchangeService.GetCurrentPriceAsync(symbol);
        await Clients.All.SendAsync("ReceivePriceUpdate", symbol, price.Value);
    }

    public async Task UnsubscribeFromSymbol(string symbol)
    {
        // To be implemented
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

        await _indicatorService.SubscribeToIndicator(symbol, indicatorType, period);
        // Trigger immediate calculation
        await _indicatorService.UpdateIndicatorsAsync();
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
        await _indicatorService.UnsubscribeFromIndicator(symbol, indicatorType);
    }

    public async Task UnsubscribeFromIndicatorWithTimeframe(string symbol, IndicatorType indicatorType, Timeframe timeframe)
    {
        await _indicatorService.UnsubscribeFromIndicator(symbol, indicatorType, timeframe);
    }
}

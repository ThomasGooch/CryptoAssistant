using AkashTrends.Core.Services;
using Microsoft.AspNetCore.SignalR;

namespace AkashTrends.API.Hubs;

public class PriceUpdateHub : Hub
{
    private readonly ICryptoExchangeService _exchangeService;

    public PriceUpdateHub(ICryptoExchangeService exchangeService)
    {
        _exchangeService = exchangeService;
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
}

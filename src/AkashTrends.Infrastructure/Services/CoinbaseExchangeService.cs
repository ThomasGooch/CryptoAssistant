using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using AkashTrends.Infrastructure.ExternalApis.Coinbase;

namespace AkashTrends.Infrastructure.Services;

public class CoinbaseExchangeService : ICryptoExchangeService
{
    private readonly ICoinbaseApiClient _apiClient;

    public CoinbaseExchangeService(ICoinbaseApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    public async Task<CryptoPrice> GetCurrentPriceAsync(string symbol)
    {
        try
        {
            var response = await _apiClient.GetPriceAsync(symbol);
            var currency = CryptoCurrency.Create(symbol);
            return CryptoPrice.Create(currency, response.Data.Price, response.Data.Timestamp);
        }
        catch (ExchangeException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new ExchangeException("Failed to get current price", ex);
        }
    }

    public async Task<IReadOnlyList<CryptoPrice>> GetHistoricalPricesAsync(string symbol, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        if (startTime >= endTime)
        {
            throw new ArgumentException("Start time must be before end time");
        }

        try
        {
            var prices = await _apiClient.GetHistoricalPricesAsync(symbol, startTime, endTime);
            return prices.OrderBy(p => p.Timestamp).ToList();
        }
        catch (ExchangeException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new ExchangeException("Failed to get historical prices", ex);
        }
    }
}

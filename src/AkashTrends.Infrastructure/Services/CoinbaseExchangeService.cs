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
            var priceData = await _apiClient.GetPriceAsync(symbol);
            var currency = CryptoCurrency.Create(symbol);
            return CryptoPrice.Create(currency, priceData.Price, priceData.Timestamp);
        }
        catch (NotFoundException)
        {
            // Let NotFoundException pass through unchanged
            throw;
        }
        catch (ValidationException)
        {
            // Let ValidationException pass through unchanged
            throw;
        }
        catch (ExchangeException)
        {
            // Let ExchangeException pass through unchanged
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

    public async Task<IReadOnlyList<CandlestickData>> GetHistoricalCandlestickDataAsync(string symbol, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        if (startTime >= endTime)
        {
            throw new ArgumentException("Start time must be before end time");
        }

        try
        {
            var candlestickData = await _apiClient.GetHistoricalCandlestickDataAsync(symbol, startTime, endTime);
            return candlestickData.OrderBy(c => c.Timestamp).ToList();
        }
        catch (ExchangeException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new ExchangeException("Failed to get historical candlestick data", ex);
        }
    }
}

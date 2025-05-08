using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class CoinbaseClient : ICoinbaseApiClient
{
    private readonly HttpClient _httpClient;
    private readonly CoinbaseApiOptions _options;

    public CoinbaseClient(
        HttpClient httpClient,
        IOptionsMonitor<CoinbaseApiOptions> options)
    {
        _httpClient = httpClient;
        _options = options.CurrentValue;
        _httpClient.BaseAddress = new Uri(_options.BaseUrl);
    }

    public async Task<CoinbaseApiResponse> GetPriceAsync(string symbol)
    {
        try
        {
            var response = await _httpClient.GetAsync($"prices/{symbol}-USD/spot");
            
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new ExchangeException($"Invalid symbol: {symbol}");
            }
            
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                throw new ExchangeException("Rate limit exceeded");
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<CoinbaseApiResponse>(content);

            if (data?.Data == null)
            {
                throw new ExchangeException("Invalid response from Coinbase API");
            }

            return new CoinbaseApiResponse
            {
                Data = new CoinbasePriceData
                {
                    Price = data.Data.Price,
                    Currency = data.Data.Currency,
                    Timestamp = data.Data.Timestamp
                }
            };
        }
        catch (HttpRequestException ex)
        {
            throw new ExchangeException("Failed to connect to Coinbase API", ex);
        }
    }

    public async Task<IReadOnlyList<CryptoPrice>> GetHistoricalPricesAsync(string symbol, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        try
        {
            var response = await _httpClient.GetAsync($"prices/{symbol}-USD/historic?start={startTime:yyyy-MM-dd}&end={endTime:yyyy-MM-dd}");
            
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new ExchangeException($"Invalid symbol: {symbol}");
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var priceResponse = JsonSerializer.Deserialize<HistoricalPriceResponse>(content);

            if (priceResponse?.Data == null)
            {
                return new List<CryptoPrice>();
            }

            var currency = CryptoCurrency.Create(symbol);
            return priceResponse.Data.Select(p => CryptoPrice.Create(
                currency,
                decimal.Parse(p.Price),
                DateTimeOffset.Parse(p.Time)
            )).ToList();
        }
        catch (HttpRequestException ex)
        {
            throw new ExchangeException("Failed to connect to Coinbase API", ex);
        }
    }
}

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

    public async Task<CoinbasePriceData> GetPriceAsync(string symbol)
    {
        try
        {
            // Remove -USD suffix if it's already there
            var baseSymbol = symbol.EndsWith("-USD", StringComparison.OrdinalIgnoreCase)
                ? symbol
                : $"{symbol}-USD";

            var requestUrl = $"products/{baseSymbol}/ticker";
            Console.WriteLine($"Requesting: {_httpClient.BaseAddress}{requestUrl}");
            var response = await _httpClient.GetAsync(requestUrl);
            
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
            Console.WriteLine($"Coinbase API Response: {content}");
            
            try
            {
                var data = JsonSerializer.Deserialize<CoinbaseApiResponse>(content);
                if (data == null)
                {
                    throw new ExchangeException($"Failed to deserialize response: {content}");
                }

                return data.ToData();
            }
            catch (JsonException ex)
            {
                throw new ExchangeException($"Failed to parse Coinbase API response: {content}", ex);
            }
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
            var baseSymbol = symbol.EndsWith("-USD", StringComparison.OrdinalIgnoreCase)
                ? symbol
                : $"{symbol}-USD";

            // Convert timestamps to ISO 8601
            var start = startTime.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var end = endTime.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var response = await _httpClient.GetAsync($"products/{baseSymbol}/candles?start={start}&end={end}&granularity=3600");
            
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new ExchangeException($"Invalid symbol: {symbol}");
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Coinbase API Response: {content}");
            
            try
            {
                var priceResponse = JsonSerializer.Deserialize<HistoricalPriceResponse>(content);

                if (priceResponse?.Data == null || !priceResponse.Data.Any())
                {
                    return new List<CryptoPrice>();
                }

                var currency = CryptoCurrency.Create(symbol);
                var historicalData = priceResponse.ToHistoricalPriceData();

                return historicalData.Select(p => CryptoPrice.Create(
                    currency,
                    decimal.Parse(p.Price),
                    DateTimeOffset.Parse(p.Time)
                )).ToList();
            }
            catch (JsonException ex)
            {
                throw new ExchangeException($"Failed to parse Coinbase API response: {ex.Message}", ex);
            }
        }
        catch (HttpRequestException ex)
        {
            throw new ExchangeException("Failed to connect to Coinbase API", ex);
        }
    }
}

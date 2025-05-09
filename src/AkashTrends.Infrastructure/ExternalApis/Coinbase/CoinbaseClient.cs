using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class CoinbaseClient : ICoinbaseApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ICoinbaseAuthenticator _authenticator;

    public CoinbaseClient(
        HttpClient httpClient,
        ICoinbaseAuthenticator authenticator,
        IOptionsMonitor<CoinbaseApiOptions> options)
    {
        _httpClient = httpClient;
        _authenticator = authenticator;
        _httpClient.BaseAddress = new Uri(options.CurrentValue.BaseUrl);

        // Add required headers
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "AkashTrends/1.0");
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        
        _authenticator.ConfigureHttpClient(_httpClient);
    }

    public async Task<CoinbasePriceData> GetPriceAsync(string symbol)
    {
        try
        {
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

    private int CalculateGranularity(DateTimeOffset startTime, DateTimeOffset endTime)
    {
        var timeRange = endTime - startTime;
        var totalHours = timeRange.TotalHours;

        // Coinbase API limits to 300 data points
        // Calculate minimum granularity in seconds that keeps us under this limit
        var minGranularityHours = Math.Ceiling(totalHours / 300);
        
        // Available granularities in seconds: 60, 300, 900, 3600, 21600, 86400
        if (minGranularityHours <= 1) return 3600;     // 1 hour
        if (minGranularityHours <= 6) return 21600;    // 6 hours
        return 86400;                                   // 1 day
    }

    public async Task<IReadOnlyList<CryptoPrice>> GetHistoricalPricesAsync(string symbol, DateTimeOffset startTime, DateTimeOffset endTime)
    {
        try
        {
            var baseSymbol = symbol.EndsWith("-USD", StringComparison.OrdinalIgnoreCase)
                ? symbol
                : $"{symbol}-USD";

            // Ensure we're using UTC timestamps
            startTime = startTime.ToUniversalTime();
            endTime = endTime.ToUniversalTime();

            // Calculate appropriate granularity
            var granularity = CalculateGranularity(startTime, endTime);

            // Coinbase API expects ISO 8601 timestamps
            var requestUrl = $"products/{baseSymbol}/candles";
            var queryParams = new Dictionary<string, string>
            {
                ["start"] = startTime.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ["end"] = endTime.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ["granularity"] = granularity.ToString()
            };

            var fullUrl = $"{requestUrl}?{string.Join("&", queryParams.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"))}";
            
            Console.WriteLine($"Requesting historical prices: {fullUrl}");
            Console.WriteLine($"Start time: {startTime}, End time: {endTime}");
            Console.WriteLine($"Using granularity: {granularity} seconds");

            var response = await _httpClient.GetAsync(fullUrl);
            
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new ExchangeException($"Invalid symbol: {symbol}");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Bad Request Error: {errorContent}");
                throw new ExchangeException($"Invalid request parameters: {errorContent}");
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Coinbase API Response: {content}");

            try
            {
                // Coinbase API returns array directly, not wrapped in a response object
                var candleData = JsonSerializer.Deserialize<decimal[][]>(content);
                Console.WriteLine($"Deserialized response. Data array length: {candleData?.Length ?? 0}");

                if (candleData == null || !candleData.Any())
                {
                    Console.WriteLine("No historical price data returned");
                    return new List<CryptoPrice>();
                }

                var currency = CryptoCurrency.Create(symbol);
                var result = candleData
                    .Select(candle =>
                    {
                        try
                        {
                            var priceData = HistoricalPriceData.FromCandle(candle);
                            return CryptoPrice.Create(
                                currency,
                                priceData.Close,
                                DateTimeOffset.Parse(priceData.Time));
                        }
                        catch (ArgumentException)
                        {
                            return null;
                        }
                    })
                    .Where(x => x != null)
                    .ToList()!;

                Console.WriteLine($"Processed {result.Count} historical prices");
                return result;
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"JSON parsing error: {ex.Message}");
                Console.WriteLine($"Raw content: {content}");
                throw new ExchangeException($"Failed to parse historical price data: {content}", ex);
            }
        }
        catch (HttpRequestException ex)
        {
            Console.WriteLine($"HTTP request error: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
            }
            throw new ExchangeException("Failed to connect to Coinbase API", ex);
        }
    }
}

using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace AkashTrends.Infrastructure.ExternalApis.Coinbase;

public class CoinbaseClient : ICoinbaseApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ICoinbaseAuthenticator _authenticator;
    private readonly ILogger<CoinbaseClient> _logger;

    public CoinbaseClient(
        HttpClient httpClient,
        ICoinbaseAuthenticator authenticator,
        IOptionsMonitor<CoinbaseApiOptions> options,
        ILogger<CoinbaseClient> logger)
    {
        _httpClient = httpClient;
        _authenticator = authenticator;
        _logger = logger;
        _httpClient.BaseAddress = new Uri(options.CurrentValue.BaseUrl);

        // Add required headers
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "AkashTrends/1.0");
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        
        _authenticator.ConfigureHttpClient(_httpClient);
    }

    public async Task<CoinbasePriceData> GetPriceAsync(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ValidationException("Symbol cannot be empty");
        }

        // Normalize symbol format
        symbol = symbol.Trim().ToUpperInvariant();
        if (symbol.Contains("-"))
        {
            throw new ValidationException("Please provide the base symbol only (e.g., 'BTC' not 'BTC-USD')");
        }

        try
        {
            var baseSymbol = $"{symbol}-USD";

            var requestUrl = $"products/{baseSymbol}/ticker";
            _logger.LogInformation("Requesting price data from Coinbase: {0}", $"{_httpClient.BaseAddress}{requestUrl}");
            var response = await _httpClient.GetAsync(requestUrl);
            
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new NotFoundException($"Invalid symbol: {symbol}");
            }
            
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                throw new RateLimitExceededException("Coinbase API rate limit exceeded");
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            _logger.LogDebug("Coinbase API Response: {0}", content);
            
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
                _logger.LogError(ex, "Failed to parse Coinbase API response: {0}", content);
                throw new ExchangeException($"Failed to parse Coinbase API response", ex);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Coinbase API");
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
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ValidationException("Symbol cannot be empty");
        }

        if (startTime >= endTime)
        {
            throw new ValidationException("Start time must be before end time");
        }

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
            
            _logger.LogInformation("Requesting historical prices from Coinbase: {0}", fullUrl);
            _logger.LogDebug("Request parameters - Start time: {0}, End time: {1}, Granularity: {2}s", 
                startTime, endTime, granularity);

            var response = await _httpClient.GetAsync(fullUrl);
            
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new NotFoundException($"Invalid symbol: {symbol}");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                throw new RateLimitExceededException("Coinbase API rate limit exceeded");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Bad Request Error from Coinbase API: {0}", errorContent);
                throw new ValidationException($"Invalid request parameters: {errorContent}");
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            _logger.LogDebug("Coinbase API Response received");

            try
            {
                // Coinbase API returns array directly, not wrapped in a response object
                var candleData = JsonSerializer.Deserialize<decimal[][]>(content);
                _logger.LogInformation("Deserialized historical price data. Count: {0}", candleData?.Length ?? 0);

                if (candleData == null || !candleData.Any())
                {
                    _logger.LogWarning("No historical price data returned for {0}", symbol);
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

                _logger.LogInformation("Processed {0} historical prices for {1}", result.Count, symbol);
                return result;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON parsing error for historical price data");
                throw new ExchangeException("Failed to parse historical price data", ex);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request error while fetching historical prices");
            throw new ExchangeException("Failed to connect to Coinbase API", ex);
        }
    }
}

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
    private readonly IResilienceService _resilienceService;
    private bool _isConfigured = false;

    public CoinbaseClient(
        HttpClient httpClient,
        ICoinbaseAuthenticator authenticator,
        IOptionsMonitor<CoinbaseApiOptions> options,
        ILogger<CoinbaseClient> logger,
        IResilienceService resilienceService)
    {
        _httpClient = httpClient;
        _authenticator = authenticator;
        _logger = logger;
        _resilienceService = resilienceService;
        _httpClient.BaseAddress = new Uri(options.CurrentValue.BaseUrl);

        // Add required headers
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "AkashTrends/1.0");
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");

        // Don't configure authenticator here - do it lazily when first needed
    }

    private void EnsureConfigured()
    {
        if (!_isConfigured)
        {
            _authenticator.ConfigureHttpClient(_httpClient);
            _isConfigured = true;
        }
    }

    public async Task<CoinbasePriceData> GetPriceAsync(string symbol)
    {
        EnsureConfigured(); // Configure authentication lazily

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

        var operationKey = $"coinbase_price_{symbol}";
        var resilenceOptions = new ResilienceOptions
        {
            OperationKey = operationKey,
            MaxRetryAttempts = 3,
            BaseDelay = TimeSpan.FromSeconds(1),
            MaxDelay = TimeSpan.FromSeconds(10),
            CircuitBreakerThreshold = 3,
            SamplingDuration = TimeSpan.FromMinutes(1),
            BreakDuration = TimeSpan.FromSeconds(30),
            MinimumThroughput = 2,
            Timeout = TimeSpan.FromSeconds(15)
        };

        return await _resilienceService.ExecuteHttpOperationAsync(async () =>
        {
            var baseSymbol = $"{symbol}-USD";
            var requestUrl = $"products/{baseSymbol}/ticker";

            _logger.LogDebug("Requesting price data from Coinbase: {RequestUrl}",
                $"{_httpClient.BaseAddress}{requestUrl}");

            var response = await _httpClient.GetAsync(requestUrl);

            // Handle specific HTTP status codes
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
            _logger.LogDebug("Coinbase API Response received for symbol: {Symbol}", symbol);

            try
            {
                var data = JsonSerializer.Deserialize<CoinbaseApiResponse>(content);
                if (data == null)
                {
                    throw new ExchangeException($"Failed to deserialize response for symbol: {symbol}");
                }

                return data.ToData();
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse Coinbase API response for symbol: {Symbol}", symbol);
                throw new ExchangeException($"Failed to parse Coinbase API response for symbol: {symbol}", ex);
            }

        }, resilenceOptions);
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
        EnsureConfigured(); // Configure authentication lazily

        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ValidationException("Symbol cannot be empty");
        }

        if (startTime >= endTime)
        {
            throw new ValidationException("Start time must be before end time");
        }

        var operationKey = $"coinbase_historical_{symbol}";
        var resilenceOptions = new ResilienceOptions
        {
            OperationKey = operationKey,
            MaxRetryAttempts = 3,
            BaseDelay = TimeSpan.FromSeconds(2),
            MaxDelay = TimeSpan.FromSeconds(15),
            CircuitBreakerThreshold = 4,
            SamplingDuration = TimeSpan.FromMinutes(2),
            BreakDuration = TimeSpan.FromMinutes(1),
            MinimumThroughput = 3,
            Timeout = TimeSpan.FromSeconds(30)
        };

        return await _resilienceService.ExecuteHttpOperationAsync(async () =>
        {
            var baseSymbol = symbol.EndsWith("-USD", StringComparison.OrdinalIgnoreCase)
                ? symbol
                : $"{symbol}-USD";

            // Ensure we're using UTC timestamps
            var utcStartTime = startTime.ToUniversalTime();
            var utcEndTime = endTime.ToUniversalTime();

            // Calculate appropriate granularity
            var granularity = CalculateGranularity(utcStartTime, utcEndTime);

            // Coinbase API expects ISO 8601 timestamps
            var requestUrl = $"products/{baseSymbol}/candles";
            var queryParams = new Dictionary<string, string>
            {
                ["start"] = utcStartTime.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ["end"] = utcEndTime.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                ["granularity"] = granularity.ToString()
            };

            var fullUrl = $"{requestUrl}?{string.Join("&", queryParams.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"))}";

            _logger.LogDebug("Requesting historical prices from Coinbase: {RequestUrl}", fullUrl);
            _logger.LogDebug("Request parameters - Symbol: {Symbol}, Start: {Start}, End: {End}, Granularity: {Granularity}s",
                symbol, utcStartTime, utcEndTime, granularity);

            var response = await _httpClient.GetAsync(fullUrl);

            // Handle specific HTTP status codes
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
                _logger.LogWarning("Bad Request Error from Coinbase API for symbol {Symbol}: {Error}",
                    symbol, errorContent);
                throw new ValidationException($"Invalid request parameters for symbol {symbol}: {errorContent}");
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            _logger.LogDebug("Historical price data received for symbol: {Symbol}", symbol);

            try
            {
                // Coinbase API returns array directly, not wrapped in a response object
                var candleData = JsonSerializer.Deserialize<decimal[][]>(content);
                _logger.LogDebug("Deserialized {Count} candles for symbol: {Symbol}",
                    candleData?.Length ?? 0, symbol);

                if (candleData == null || !candleData.Any())
                {
                    _logger.LogInformation("No historical price data returned for symbol: {Symbol}", symbol);
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
                        catch (ArgumentException ex)
                        {
                            _logger.LogWarning(ex, "Failed to parse candle data for symbol: {Symbol}", symbol);
                            return null;
                        }
                    })
                    .Where(x => x != null)
                    .Cast<CryptoPrice>()
                    .OrderBy(p => p.Timestamp)
                    .ToList();

                _logger.LogInformation("Successfully processed {Count} historical prices for symbol: {Symbol}",
                    result.Count, symbol);
                return result;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON parsing error for historical price data for symbol: {Symbol}", symbol);
                throw new ExchangeException($"Failed to parse historical price data for symbol: {symbol}", ex);
            }

        }, resilenceOptions);
    }
}

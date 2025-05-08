using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Infrastructure.ExternalApis.Coinbase;
using AkashTrends.Infrastructure.Tests.TestHelpers;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;
using System.Net;
using System.Text.Json;
using Xunit;

namespace AkashTrends.Infrastructure.Tests.ExternalApis.Coinbase;

public class CoinbaseClientTests
{
    private TestHttpMessageHandler _handler;
    private HttpClient _httpClient;
    private readonly CoinbaseApiOptions _options;
    private readonly IOptionsMonitor<CoinbaseApiOptions> _optionsMonitor;
    private CoinbaseClient _client;

    public CoinbaseClientTests()
    {
        var responseMessage = new HttpResponseMessage();
        _handler = new TestHttpMessageHandler((req, ct) => Task.FromResult(responseMessage));
        _httpClient = new HttpClient(_handler);
        
        _options = new CoinbaseApiOptions
        {
            BaseUrl = "https://api.coinbase.com/v2/",
            ApiKey = "test-key",
            ApiSecret = "test-secret"
        };
        
        _optionsMonitor = Substitute.For<IOptionsMonitor<CoinbaseApiOptions>>();
        _optionsMonitor.CurrentValue.Returns(_options);

        _client = new CoinbaseClient(_httpClient, _optionsMonitor);
    }

    [Fact]
    public async Task Should_ReturnPrice_When_SymbolIsValid()
    {
        // Arrange
        var symbol = "BTC";
        var price = 50000.00m;
        var timestamp = DateTimeOffset.UtcNow;

        var response = new
        {
            data = new
            {
                amount = price.ToString(),
                currency = "USD",
                timestamp = timestamp.ToString("O")
            }
        };

        SetupMockResponse(HttpStatusCode.OK, JsonSerializer.Serialize(response));

        // Act
        var result = await _client.GetPriceAsync(symbol);

        // Assert
        result.Data.Price.Should().Be(price);
        result.Data.Timestamp.Should().BeCloseTo(timestamp, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Should_ThrowExchangeException_When_SymbolIsInvalid()
    {
        // Arrange
        var errorResponse = new
        {
            errors = new[] { new { message = "Invalid symbol" } }
        };

        SetupMockResponse(HttpStatusCode.NotFound, JsonSerializer.Serialize(errorResponse));

        // Act
        var act = () => _client.GetPriceAsync("INVALID");

        // Assert
        await act.Should().ThrowAsync<ExchangeException>()
            .WithMessage("Invalid symbol*");
    }

    [Fact]
    public async Task Should_ThrowExchangeException_When_RateLimited()
    {
        // Arrange
        SetupMockResponse(HttpStatusCode.TooManyRequests, JsonSerializer.Serialize(new { }));

        // Act
        var act = () => _client.GetPriceAsync("BTC");

        // Assert
        await act.Should().ThrowAsync<ExchangeException>()
            .WithMessage("Rate limit exceeded*");
    }

    [Fact]
    public async Task Should_ReturnPrices_When_GetHistoricalPricesWithValidParameters()
    {
        // Arrange
        var symbol = "BTC";
        var startTime = DateTimeOffset.UtcNow.AddDays(-1);
        var endTime = DateTimeOffset.UtcNow;
        
        var historicalData = new[]
        {
            new { price = "49000.00", time = startTime.AddHours(1).ToString("O") },
            new { price = "50000.00", time = startTime.AddHours(2).ToString("O") }
        };

        var response = new { data = historicalData };

        SetupMockResponse(HttpStatusCode.OK, JsonSerializer.Serialize(response));

        // Act
        var result = await _client.GetHistoricalPricesAsync(symbol, startTime, endTime);

        // Assert
        result.Should().HaveCount(2);
        result[0].Value.Should().Be(49000.00m);
        result[1].Value.Should().Be(50000.00m);
    }

    private void SetupMockResponse(HttpStatusCode statusCode, string content)
    {
        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(content)
        };

        _handler = new TestHttpMessageHandler((req, ct) => Task.FromResult(response));
        _httpClient.Dispose();
        _httpClient = new HttpClient(_handler);
        _client = new CoinbaseClient(_httpClient, _optionsMonitor);
    }
}

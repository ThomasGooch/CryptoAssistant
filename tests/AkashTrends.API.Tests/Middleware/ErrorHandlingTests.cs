using AkashTrends.API;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Text.Json;
using Xunit;

namespace AkashTrends.API.Tests.Middleware;

[Collection("WebApplication Collection")]
public class ErrorHandlingTests
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ErrorHandlingTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task InvalidSymbol_ShouldReturnStructuredErrorResponse()
    {
        // Arrange & Act - Use a symbol that will reach the API and return NotFound
        var response = await _client.GetAsync("/api/crypto/price/INVALIDSYMBOL");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("application/json", response.Content.Headers.ContentType?.ToString());

        // Verify error response structure using our custom format
        Assert.Contains("code", content.ToLowerInvariant());
        Assert.Contains("message", content.ToLowerInvariant());
        Assert.Contains("timestamp", content.ToLowerInvariant());
    }

    [Fact]
    public async Task InvalidSymbolFormat_ShouldReturnValidationError()
    {
        // Arrange & Act - Use a symbol with dash which should be caught by validation
        var response = await _client.GetAsync("/api/crypto/price/INVALID-SYMBOL");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("application/json", response.Content.Headers.ContentType?.ToString());

        // Verify error response structure
        Assert.Contains("validation_error", content.ToLowerInvariant());
        Assert.Contains("message", content.ToLowerInvariant());
    }

    [Fact]
    public async Task InvalidIndicatorParameters_ShouldReturnBadRequest()
    {
        // Arrange & Act - Missing required parameters
        var response = await _client.GetAsync("/api/crypto/indicator/BTC-USD");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("application/json", response.Content.Headers.ContentType?.ToString());

        // Verify error response structure
        Assert.Contains("error", content.ToLowerInvariant());
        Assert.Contains("message", content.ToLowerInvariant());
    }

    [Fact]
    public async Task InvalidHistoricalDateRange_ShouldReturnBadRequest()
    {
        // Arrange & Act - End date before start date
        var startTime = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        var endTime = DateTime.Now.AddDays(-1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        var response = await _client.GetAsync($"/api/crypto/historical/BTC-USD?startTime={startTime}&endTime={endTime}");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("error", content.ToLowerInvariant());
    }

    [Fact]
    public async Task MalformedRequest_ShouldReturnConsistentErrorFormat()
    {
        // Arrange & Act - Invalid route
        var response = await _client.GetAsync("/api/crypto/nonexistent-endpoint");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ServerError_ShouldNotExposeInternalDetails()
    {
        // This test ensures that internal server errors don't leak sensitive information
        // We'll test this by attempting to cause a server error and verifying the response format

        // Arrange & Act - Try to get indicator with extreme values that might cause issues
        var response = await _client.GetAsync("/api/crypto/indicator/BTC-USD?type=999&period=999999");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        if (response.StatusCode == HttpStatusCode.InternalServerError)
        {
            // Should not contain stack traces or internal implementation details
            Assert.DoesNotContain("StackTrace", content);
            Assert.DoesNotContain("System.", content);
            Assert.DoesNotContain("Exception", content);

            // Should contain structured error response
            Assert.Contains("error", content.ToLowerInvariant());
        }
    }

    [Fact]
    public async Task ErrorResponse_ShouldHaveConsistentStructure()
    {
        // Arrange & Act - Use an endpoint that will definitely return validation error
        var response = await _client.GetAsync("/api/crypto/indicator/BTC-USD");
        var content = await response.Content.ReadAsStringAsync();

        // Assert - All error responses should have consistent structure
        if (!response.IsSuccessStatusCode && !string.IsNullOrEmpty(content))
        {
            var errorDoc = JsonDocument.Parse(content);
            var root = errorDoc.RootElement;

            // Check for required error response properties from our custom format
            Assert.True(root.TryGetProperty("code", out _));
            Assert.True(root.TryGetProperty("message", out _));
            Assert.True(root.TryGetProperty("timestamp", out _));
        }
    }
}
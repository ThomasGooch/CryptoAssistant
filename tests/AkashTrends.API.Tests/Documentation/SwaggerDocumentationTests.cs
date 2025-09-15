using AkashTrends.API;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using Xunit;

namespace AkashTrends.API.Tests.Documentation;

[Collection("WebApplication Collection")]
public class SwaggerDocumentationTests
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SwaggerDocumentationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task SwaggerUI_ShouldBeAccessible()
    {
        // Arrange & Act
        var response = await _client.GetAsync("/swagger");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("swagger-ui", content.ToLowerInvariant());
    }

    [Fact]
    public async Task SwaggerJson_ShouldBeAccessible()
    {
        // Arrange & Act
        var response = await _client.GetAsync("/swagger/v1/swagger.json");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json; charset=utf-8", response.Content.Headers.ContentType?.ToString());

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("openapi", content);
        Assert.Contains("AkashTrends API", content);
    }

    [Fact]
    public void Swagger_ShouldBeConfiguredInServices()
    {
        // Arrange & Act
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;

        // Assert - Verify Swagger generator service is registered
        var swaggerGenerator = services.GetService<Swashbuckle.AspNetCore.Swagger.ISwaggerProvider>();
        Assert.NotNull(swaggerGenerator);
    }

    [Theory]
    [InlineData("Crypto")]
    [InlineData("Get current price")]
    [InlineData("Get historical prices")]
    [InlineData("Calculate technical indicator")]
    public async Task SwaggerJson_ShouldContainControllerDocumentation(string expectedContent)
    {
        // Arrange & Act
        var response = await _client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Contains(expectedContent, content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SwaggerJson_ShouldContainResponseSchemas()
    {
        // Arrange & Act
        var response = await _client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Contains("schemas", content);
        Assert.Contains("CryptoPriceResponse", content);
        Assert.Contains("IndicatorResponse", content);
        Assert.Contains("HistoricalPricesResponse", content);
    }
}
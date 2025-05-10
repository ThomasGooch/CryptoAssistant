using AkashTrends.API.Middleware;
using AkashTrends.API.Models;
using AkashTrends.Core.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using System.Net;
using System.Text.Json;
using Xunit;

namespace AkashTrends.API.Tests.Middleware;

public class ExceptionHandlingMiddlewareTests
{
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly RequestDelegate _next;

    public ExceptionHandlingMiddlewareTests()
    {
        _logger = Substitute.For<ILogger<ExceptionHandlingMiddleware>>();
        _environment = Substitute.For<IWebHostEnvironment>();
        _next = Substitute.For<RequestDelegate>();
    }

    [Fact]
    public async Task InvokeAsync_WithValidationException_ReturnsBadRequest()
    {
        // Arrange
        var middleware = new ExceptionHandlingMiddleware(_next, _logger, _environment);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        
        var expectedMessage = "Validation failed";
        _next.When(x => x.Invoke(Arg.Any<HttpContext>()))
            .Do(x => throw new ValidationException(expectedMessage));

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal((int)HttpStatusCode.BadRequest, context.Response.StatusCode);
        
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var errorResponse = JsonSerializer.Deserialize<ErrorResponse>(responseBody, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        Assert.NotNull(errorResponse);
        Assert.Equal("VALIDATION_ERROR", errorResponse.Code);
        Assert.Equal(expectedMessage, errorResponse.Message);
    }

    [Fact]
    public async Task InvokeAsync_WithNotFoundException_ReturnsNotFound()
    {
        // Arrange
        var middleware = new ExceptionHandlingMiddleware(_next, _logger, _environment);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        
        var expectedMessage = "Resource not found";
        _next.When(x => x.Invoke(Arg.Any<HttpContext>()))
            .Do(x => throw new NotFoundException(expectedMessage));

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal((int)HttpStatusCode.NotFound, context.Response.StatusCode);
        
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var errorResponse = JsonSerializer.Deserialize<ErrorResponse>(responseBody, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        Assert.NotNull(errorResponse);
        Assert.Equal("NOT_FOUND", errorResponse.Code);
        Assert.Equal(expectedMessage, errorResponse.Message);
    }

    [Fact]
    public async Task InvokeAsync_WithRateLimitExceededException_ReturnsTooManyRequests()
    {
        // Arrange
        var middleware = new ExceptionHandlingMiddleware(_next, _logger, _environment);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        
        var expectedMessage = "Rate limit exceeded";
        _next.When(x => x.Invoke(Arg.Any<HttpContext>()))
            .Do(x => throw new RateLimitExceededException(expectedMessage));

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal((int)HttpStatusCode.TooManyRequests, context.Response.StatusCode);
        
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var errorResponse = JsonSerializer.Deserialize<ErrorResponse>(responseBody, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        Assert.NotNull(errorResponse);
        Assert.Equal("RATE_LIMIT_EXCEEDED", errorResponse.Code);
        Assert.Equal(expectedMessage, errorResponse.Message);
    }

    [Fact]
    public async Task InvokeAsync_WithExchangeException_ReturnsBadGateway()
    {
        // Arrange
        var middleware = new ExceptionHandlingMiddleware(_next, _logger, _environment);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        
        var expectedMessage = "Exchange error";
        _next.When(x => x.Invoke(Arg.Any<HttpContext>()))
            .Do(x => throw new ExchangeException(expectedMessage));

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal((int)HttpStatusCode.BadGateway, context.Response.StatusCode);
        
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var errorResponse = JsonSerializer.Deserialize<ErrorResponse>(responseBody, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        Assert.NotNull(errorResponse);
        Assert.Equal("EXCHANGE_ERROR", errorResponse.Code);
        Assert.Equal(expectedMessage, errorResponse.Message);
    }

    [Fact]
    public async Task InvokeAsync_WithUnhandledException_ReturnsInternalServerError()
    {
        // Arrange
        var middleware = new ExceptionHandlingMiddleware(_next, _logger, _environment);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        
        var expectedMessage = "Unhandled exception";
        _next.When(x => x.Invoke(Arg.Any<HttpContext>()))
            .Do(x => throw new Exception(expectedMessage));

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal((int)HttpStatusCode.InternalServerError, context.Response.StatusCode);
        
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var errorResponse = JsonSerializer.Deserialize<ErrorResponse>(responseBody, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        Assert.NotNull(errorResponse);
        Assert.Equal("INTERNAL_SERVER_ERROR", errorResponse.Code);
        Assert.Equal(expectedMessage, errorResponse.Message);
    }

    [Fact]
    public async Task InvokeAsync_InDevelopmentMode_IncludesStackTrace()
    {
        // Arrange
        _environment.EnvironmentName.Returns("Development");
        var middleware = new ExceptionHandlingMiddleware(_next, _logger, _environment);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        
        var exception = new Exception("Test exception");
        _next.When(x => x.Invoke(Arg.Any<HttpContext>()))
            .Do(x => throw exception);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var errorResponse = JsonSerializer.Deserialize<ErrorResponse>(responseBody, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        Assert.NotNull(errorResponse);
        Assert.NotNull(errorResponse.Details);
    }

    [Fact]
    public async Task InvokeAsync_InProductionMode_DoesNotIncludeStackTrace()
    {
        // Arrange
        _environment.EnvironmentName.Returns("Production");
        var middleware = new ExceptionHandlingMiddleware(_next, _logger, _environment);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        
        var exception = new Exception("Test exception");
        _next.When(x => x.Invoke(Arg.Any<HttpContext>()))
            .Do(x => throw exception);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var errorResponse = JsonSerializer.Deserialize<ErrorResponse>(responseBody, 
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        
        Assert.NotNull(errorResponse);
        Assert.Null(errorResponse.Details);
    }
}

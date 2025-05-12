using AkashTrends.API.Models;
using AkashTrends.Core.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace AkashTrends.API.Middleware;

/// <summary>
/// Middleware for handling exceptions globally and returning standardized error responses
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        _logger.LogError(exception, "An unhandled exception occurred: {Message}. Stack trace: {StackTrace}", 
            exception.Message,
            exception.StackTrace);

        if (exception.InnerException != null)
        {
            _logger.LogError(exception.InnerException, "Inner exception: {Message}. Stack trace: {StackTrace}",
                exception.InnerException.Message,
                exception.InnerException.StackTrace);
        }

        var statusCode = GetStatusCode(exception);
        var response = CreateErrorResponse(exception, statusCode, _environment.IsDevelopment());

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }

    private static HttpStatusCode GetStatusCode(Exception exception)
    {
        return exception switch
        {
            ValidationException => HttpStatusCode.BadRequest,
            NotFoundException => HttpStatusCode.NotFound,
            RateLimitExceededException => HttpStatusCode.TooManyRequests,
            ExchangeException => HttpStatusCode.BadGateway,
            _ => HttpStatusCode.InternalServerError
        };
    }

    private static ErrorResponse CreateErrorResponse(Exception exception, HttpStatusCode statusCode, bool isDevelopment)
    {
        var errorCode = GetErrorCode(exception);
        var response = new ErrorResponse
        {
            Code = errorCode,
            Message = exception.Message,
            Timestamp = DateTimeOffset.UtcNow
        };

        if (isDevelopment)
        {
            response.Details = exception.StackTrace;
        }

        return response;
    }

    private static string GetErrorCode(Exception exception)
    {
        return exception switch
        {
            ValidationException => "VALIDATION_ERROR",
            NotFoundException => "NOT_FOUND",
            RateLimitExceededException => "RATE_LIMIT_EXCEEDED",
            ExchangeException => "EXCHANGE_ERROR",
            _ => "INTERNAL_SERVER_ERROR"
        };
    }
}

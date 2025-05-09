using System.Text.Json.Serialization;

namespace AkashTrends.API.Models;

/// <summary>
/// Standardized error response model for API errors
/// </summary>
public class ErrorResponse
{
    /// <summary>
    /// Error code that uniquely identifies the error type
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable error message
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Optional details about the error for debugging purposes
    /// Only included in development environment
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Details { get; set; }

    /// <summary>
    /// Timestamp when the error occurred
    /// </summary>
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Optional validation errors
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IDictionary<string, string[]>? ValidationErrors { get; set; }
}

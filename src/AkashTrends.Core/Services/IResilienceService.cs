namespace AkashTrends.Core.Services;

/// <summary>
/// Service for applying resilience patterns to operations
/// </summary>
public interface IResilienceService
{
    /// <summary>
    /// Executes an HTTP operation with retry and circuit breaker patterns
    /// </summary>
    /// <typeparam name="T">Return type</typeparam>
    /// <param name="operation">The operation to execute</param>
    /// <param name="operationKey">Unique key for circuit breaker isolation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result of the operation</returns>
    Task<T> ExecuteHttpOperationAsync<T>(
        Func<Task<T>> operation,
        string operationKey,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes an HTTP operation with custom resilience options
    /// </summary>
    /// <typeparam name="T">Return type</typeparam>
    /// <param name="operation">The operation to execute</param>
    /// <param name="options">Resilience options</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result of the operation</returns>
    Task<T> ExecuteHttpOperationAsync<T>(
        Func<Task<T>> operation,
        ResilienceOptions options,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets circuit breaker state for monitoring
    /// </summary>
    /// <param name="operationKey">Operation key</param>
    /// <returns>Circuit breaker state information</returns>
    CircuitBreakerState GetCircuitBreakerState(string operationKey);
}

/// <summary>
/// Options for configuring resilience patterns
/// </summary>
public record ResilienceOptions
{
    /// <summary>
    /// Unique key for circuit breaker isolation
    /// </summary>
    public string OperationKey { get; init; } = string.Empty;

    /// <summary>
    /// Maximum number of retry attempts
    /// </summary>
    public int MaxRetryAttempts { get; init; } = 3;

    /// <summary>
    /// Base delay between retries
    /// </summary>
    public TimeSpan BaseDelay { get; init; } = TimeSpan.FromSeconds(1);

    /// <summary>
    /// Maximum delay between retries
    /// </summary>
    public TimeSpan MaxDelay { get; init; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Circuit breaker failure threshold
    /// </summary>
    public int CircuitBreakerThreshold { get; init; } = 5;

    /// <summary>
    /// Circuit breaker sampling duration
    /// </summary>
    public TimeSpan SamplingDuration { get; init; } = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Circuit breaker break duration (how long to stay open)
    /// </summary>
    public TimeSpan BreakDuration { get; init; } = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Minimum throughput required for circuit breaker evaluation
    /// </summary>
    public int MinimumThroughput { get; init; } = 3;

    /// <summary>
    /// Timeout for individual operations
    /// </summary>
    public TimeSpan Timeout { get; init; } = TimeSpan.FromSeconds(30);
}

/// <summary>
/// Circuit breaker state information
/// </summary>
public record CircuitBreakerState
{
    /// <summary>
    /// Current state of the circuit breaker
    /// </summary>
    public CircuitBreakerStatus Status { get; init; }

    /// <summary>
    /// Number of recent failures
    /// </summary>
    public int FailureCount { get; init; }

    /// <summary>
    /// Number of recent successes
    /// </summary>
    public int SuccessCount { get; init; }

    /// <summary>
    /// Last exception that occurred
    /// </summary>
    public Exception? LastException { get; init; }

    /// <summary>
    /// Time when circuit breaker last changed state
    /// </summary>
    public DateTimeOffset LastStateChange { get; init; }

    /// <summary>
    /// Time when circuit breaker will attempt to close (if currently open)
    /// </summary>
    public DateTimeOffset? NextAttempt { get; init; }
}

/// <summary>
/// Circuit breaker status values
/// </summary>
public enum CircuitBreakerStatus
{
    /// <summary>
    /// Circuit breaker is closed - operations are allowed
    /// </summary>
    Closed,

    /// <summary>
    /// Circuit breaker is open - operations are blocked
    /// </summary>
    Open,

    /// <summary>
    /// Circuit breaker is half-open - testing if operations can succeed
    /// </summary>
    HalfOpen
}
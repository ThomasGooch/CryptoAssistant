using AkashTrends.Core.Services;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using Polly.Timeout;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;

namespace AkashTrends.Infrastructure.Services;

/// <summary>
/// Implementation of IResilienceService using Polly for resilience patterns
/// </summary>
public class ResilienceService : IResilienceService
{
    private readonly ILogger<ResilienceService> _logger;
    private readonly ITimeProvider _timeProvider;
    private readonly ConcurrentDictionary<string, ResiliencePipeline> _pipelines = new();
    private readonly ConcurrentDictionary<string, CircuitBreakerState> _circuitBreakerStates = new();

    // Default resilience options for different operation types
    private static readonly ResilienceOptions DefaultHttpOptions = new()
    {
        MaxRetryAttempts = 3,
        BaseDelay = TimeSpan.FromSeconds(1),
        MaxDelay = TimeSpan.FromSeconds(30),
        CircuitBreakerThreshold = 5,
        SamplingDuration = TimeSpan.FromMinutes(2),
        BreakDuration = TimeSpan.FromMinutes(1),
        MinimumThroughput = 3,
        Timeout = TimeSpan.FromSeconds(30)
    };

    public ResilienceService(ILogger<ResilienceService> logger, ITimeProvider timeProvider)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    }

    public async Task<T> ExecuteHttpOperationAsync<T>(
        Func<Task<T>> operation,
        string operationKey,
        CancellationToken cancellationToken = default)
    {
        var options = DefaultHttpOptions with { OperationKey = operationKey };
        return await ExecuteHttpOperationAsync(operation, options, cancellationToken);
    }

    public async Task<T> ExecuteHttpOperationAsync<T>(
        Func<Task<T>> operation,
        ResilienceOptions options,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(options.OperationKey))
        {
            throw new ArgumentException("OperationKey is required", nameof(options));
        }

        var pipeline = GetOrCreatePipeline(options);

        try
        {
            var result = await pipeline.ExecuteAsync(async (context) =>
            {
                _logger.LogDebug("Executing operation: {OperationKey}", options.OperationKey);

                return await operation();
            }, cancellationToken);

            // Update circuit breaker state on success
            UpdateCircuitBreakerState(options.OperationKey, true, null);

            return result;
        }
        catch (BrokenCircuitException ex)
        {
            _logger.LogWarning("Circuit breaker is open for operation: {OperationKey}", options.OperationKey);
            UpdateCircuitBreakerState(options.OperationKey, false, ex);
            throw;
        }
        catch (TimeoutRejectedException ex)
        {
            _logger.LogWarning("Operation timeout for: {OperationKey}", options.OperationKey);
            UpdateCircuitBreakerState(options.OperationKey, false, ex);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Operation failed for: {OperationKey}", options.OperationKey);
            UpdateCircuitBreakerState(options.OperationKey, false, ex);
            throw;
        }
    }

    public CircuitBreakerState GetCircuitBreakerState(string operationKey)
    {
        return _circuitBreakerStates.GetValueOrDefault(operationKey, new CircuitBreakerState
        {
            Status = CircuitBreakerStatus.Closed,
            FailureCount = 0,
            SuccessCount = 0,
            LastStateChange = _timeProvider.GetUtcNow()
        });
    }

    private ResiliencePipeline GetOrCreatePipeline(ResilienceOptions options)
    {
        return _pipelines.GetOrAdd(options.OperationKey, _ => CreatePipeline(options));
    }

    private ResiliencePipeline CreatePipeline(ResilienceOptions options)
    {
        return new ResiliencePipelineBuilder()
            .AddTimeout(new TimeoutStrategyOptions
            {
                Timeout = options.Timeout,
                OnTimeout = args =>
                {
                    _logger.LogWarning("Operation timeout after {Timeout} for: {OperationKey}",
                        options.Timeout, options.OperationKey);
                    return default;
                }
            })
            .AddRetry(new RetryStrategyOptions
            {
                ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>()
                    .Handle<TaskCanceledException>()
                    .Handle<TimeoutException>()
                    .Handle<SocketException>()
                    .Handle<Exception>(ex => IsTransientException(ex)),
                MaxRetryAttempts = options.MaxRetryAttempts,
                DelayGenerator = args =>
                {
                    var delay = TimeSpan.FromMilliseconds(
                        Math.Min(
                            options.BaseDelay.TotalMilliseconds * Math.Pow(2, args.AttemptNumber),
                            options.MaxDelay.TotalMilliseconds));
                    return new ValueTask<TimeSpan?>(delay);
                },
                OnRetry = args =>
                {
                    var attemptNumber = args.AttemptNumber + 1;
                    var delay = args.RetryDelay;

                    _logger.LogWarning("Retry attempt {AttemptNumber} for operation: {OperationKey}, " +
                        "Delay: {Delay}ms, Exception: {Exception}",
                        attemptNumber, options.OperationKey, delay.TotalMilliseconds,
                        args.Outcome.Exception?.Message ?? "Unknown error");

                    return default;
                }
            })
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions
            {
                ShouldHandle = new PredicateBuilder().Handle<Exception>(ex => !IsNonTransientException(ex)),
                FailureRatio = Math.Min(1.0, (double)options.CircuitBreakerThreshold / options.MinimumThroughput),
                MinimumThroughput = options.MinimumThroughput,
                SamplingDuration = options.SamplingDuration,
                BreakDuration = options.BreakDuration,
                OnOpened = args =>
                {
                    _logger.LogWarning("Circuit breaker opened for operation: {OperationKey}, " +
                        "Break duration: {BreakDuration}, Exception: {Exception}",
                        options.OperationKey, options.BreakDuration, args.Outcome.Exception?.Message);

                    UpdateCircuitBreakerState(options.OperationKey, false, args.Outcome.Exception, CircuitBreakerStatus.Open);
                    return default;
                },
                OnClosed = args =>
                {
                    _logger.LogInformation("Circuit breaker closed for operation: {OperationKey}", options.OperationKey);
                    UpdateCircuitBreakerState(options.OperationKey, true, null, CircuitBreakerStatus.Closed);
                    return default;
                },
                OnHalfOpened = args =>
                {
                    _logger.LogInformation("Circuit breaker half-opened for operation: {OperationKey}", options.OperationKey);
                    UpdateCircuitBreakerState(options.OperationKey, false, null, CircuitBreakerStatus.HalfOpen);
                    return default;
                }
            })
            .Build();
    }

    private void UpdateCircuitBreakerState(string operationKey, bool success, Exception? exception,
        CircuitBreakerStatus? forcedStatus = null)
    {
        _circuitBreakerStates.AddOrUpdate(operationKey,
            _ => CreateNewState(success, exception, forcedStatus),
            (_, existing) => UpdateExistingState(existing, success, exception, forcedStatus));
    }

    private CircuitBreakerState CreateNewState(bool success, Exception? exception, CircuitBreakerStatus? forcedStatus)
    {
        var now = _timeProvider.GetUtcNow();
        return new CircuitBreakerState
        {
            Status = forcedStatus ?? CircuitBreakerStatus.Closed,
            FailureCount = success ? 0 : 1,
            SuccessCount = success ? 1 : 0,
            LastException = exception,
            LastStateChange = now,
            NextAttempt = forcedStatus == CircuitBreakerStatus.Open ? now.Add(DefaultHttpOptions.BreakDuration) : null
        };
    }

    private CircuitBreakerState UpdateExistingState(CircuitBreakerState existing, bool success,
        Exception? exception, CircuitBreakerStatus? forcedStatus)
    {
        var now = _timeProvider.GetUtcNow();
        var status = forcedStatus ?? existing.Status;
        var stateChanged = forcedStatus.HasValue && forcedStatus != existing.Status;

        return new CircuitBreakerState
        {
            Status = status,
            FailureCount = success ? Math.Max(0, existing.FailureCount - 1) : existing.FailureCount + 1,
            SuccessCount = success ? existing.SuccessCount + 1 : existing.SuccessCount,
            LastException = exception ?? existing.LastException,
            LastStateChange = stateChanged ? now : existing.LastStateChange,
            NextAttempt = status == CircuitBreakerStatus.Open ? now.Add(DefaultHttpOptions.BreakDuration) : null
        };
    }

    /// <summary>
    /// Determines if an exception is transient and should trigger retry logic
    /// </summary>
    private static bool IsTransientException(Exception exception)
    {
        return exception switch
        {
            HttpRequestException => true,
            TaskCanceledException => true,
            TimeoutException => true,
            SocketException => true,
            _ when exception.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase) => true,
            _ when exception.Message.Contains("connection", StringComparison.OrdinalIgnoreCase) => true,
            _ => false
        };
    }

    /// <summary>
    /// Determines if an exception should not trigger circuit breaker logic
    /// </summary>
    private static bool IsNonTransientException(Exception exception)
    {
        return exception switch
        {
            ArgumentNullException => true,
            ArgumentException => true,
            InvalidOperationException => true,
            NotSupportedException => true,
            _ when exception.GetType().Name.Contains("Validation") => true,
            _ when exception.GetType().Name.Contains("NotFound") => true,
            _ => false
        };
    }
}
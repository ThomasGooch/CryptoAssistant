using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Services;

/// <summary>
/// Service for calculating technical indicators
/// </summary>
public interface IIndicatorService
{
    /// <summary>
    /// Calculates a technical indicator for a given symbol and time range
    /// </summary>
    /// <param name="symbol">The cryptocurrency symbol</param>
    /// <param name="type">The type of indicator to calculate</param>
    /// <param name="period">The period for the indicator calculation</param>
    /// <param name="startTime">The start time for historical data</param>
    /// <param name="endTime">The end time for historical data</param>
    /// <returns>The calculated indicator result</returns>
    Task<IndicatorResult> CalculateIndicatorAsync(
        string symbol,
        IndicatorType type,
        int period,
        DateTimeOffset startTime,
        DateTimeOffset endTime);
}

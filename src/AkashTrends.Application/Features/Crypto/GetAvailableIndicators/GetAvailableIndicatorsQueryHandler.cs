using AkashTrends.Application.Common.CQRS;
using AkashTrends.Core.Analysis.Indicators;

namespace AkashTrends.Application.Features.Crypto.GetAvailableIndicators;

/// <summary>
/// Handler for GetAvailableIndicatorsQuery
/// </summary>
public class GetAvailableIndicatorsQueryHandler : IGetAvailableIndicatorsQueryHandler
{
    private readonly IIndicatorFactory _indicatorFactory;

    /// <summary>
    /// Initializes a new instance of the GetAvailableIndicatorsQueryHandler class
    /// </summary>
    /// <param name="indicatorFactory">The technical indicator factory</param>
    public GetAvailableIndicatorsQueryHandler(IIndicatorFactory indicatorFactory)
    {
        _indicatorFactory = indicatorFactory ?? throw new ArgumentNullException(nameof(indicatorFactory));
    }

    /// <summary>
    /// Handles the GetAvailableIndicatorsQuery and returns the list of available indicators
    /// </summary>
    /// <param name="query">The query to get available indicators</param>
    /// <returns>A GetAvailableIndicatorsResult containing the list of available indicators</returns>
    public Task<GetAvailableIndicatorsResult> Handle(GetAvailableIndicatorsQuery query)
    {
        var indicators = _indicatorFactory.GetAvailableIndicators();

        var result = new GetAvailableIndicatorsResult
        {
            Indicators = indicators.ToList()
        };

        return Task.FromResult(result);
    }
}

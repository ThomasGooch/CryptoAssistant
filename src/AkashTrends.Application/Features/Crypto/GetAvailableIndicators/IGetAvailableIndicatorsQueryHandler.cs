using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Crypto.GetAvailableIndicators;

/// <summary>
/// Interface for the handler of GetAvailableIndicatorsQuery
/// </summary>
public interface IGetAvailableIndicatorsQueryHandler : IQueryHandler<GetAvailableIndicatorsQuery, GetAvailableIndicatorsResult>
{
}

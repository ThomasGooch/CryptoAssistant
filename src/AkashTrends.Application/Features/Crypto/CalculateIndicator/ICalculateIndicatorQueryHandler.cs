using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Crypto.CalculateIndicator;

/// <summary>
/// Interface for the handler of CalculateIndicatorQuery
/// </summary>
public interface ICalculateIndicatorQueryHandler : IQueryHandler<CalculateIndicatorQuery, CalculateIndicatorResult>
{
}

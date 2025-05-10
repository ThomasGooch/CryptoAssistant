using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Crypto.GetCurrentPrice;

/// <summary>
/// Interface for the handler of GetCurrentPriceQuery
/// </summary>
public interface IGetCurrentPriceQueryHandler : IQueryHandler<GetCurrentPriceQuery, GetCurrentPriceResult>
{
}

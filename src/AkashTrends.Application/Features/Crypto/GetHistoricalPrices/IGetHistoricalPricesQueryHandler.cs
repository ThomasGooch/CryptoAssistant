using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Crypto.GetHistoricalPrices;

/// <summary>
/// Interface for the handler of GetHistoricalPricesQuery
/// </summary>
public interface IGetHistoricalPricesQueryHandler : IQueryHandler<GetHistoricalPricesQuery, GetHistoricalPricesResult>
{
}

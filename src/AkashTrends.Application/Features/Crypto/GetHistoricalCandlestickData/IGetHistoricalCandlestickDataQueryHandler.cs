using AkashTrends.Application.Common.CQRS;

namespace AkashTrends.Application.Features.Crypto.GetHistoricalCandlestickData;

/// <summary>
/// Interface for the GetHistoricalCandlestickDataQuery handler
/// </summary>
public interface IGetHistoricalCandlestickDataQueryHandler : IQueryHandler<GetHistoricalCandlestickDataQuery, GetHistoricalCandlestickDataResult>
{
}
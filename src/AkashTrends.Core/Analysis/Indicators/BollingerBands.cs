using AkashTrends.Core.Domain;

namespace AkashTrends.Core.Analysis.Indicators;

public class BollingerBands : IIndicator
{
    private readonly int _period;
    private readonly int _standardDeviations;
    private readonly SimpleMovingAverage _sma;

    public BollingerBands(int period, int standardDeviations = 2)
    {
        if (period <= 0)
        {
            throw new ArgumentException("Period must be greater than 0", nameof(period));
        }

        if (standardDeviations <= 0)
        {
            throw new ArgumentException("Standard deviations must be greater than 0", nameof(standardDeviations));
        }

        _period = period;
        _standardDeviations = standardDeviations;
        _sma = new SimpleMovingAverage(period);
    }

    public IndicatorResult Calculate(IReadOnlyList<CryptoPrice> prices)
    {
        if (prices == null || prices.Count < _period)
        {
            throw new ArgumentException($"Insufficient data points. Need at least {_period} prices, but got {prices?.Count ?? 0}");
        }

        // Calculate middle band (SMA)
        var middleBand = _sma.Calculate(prices).Value;

        // Calculate standard deviation
        var variance = prices.Take(_period)
            .Select(p => p.Value)
            .Select(price => Math.Pow((double)(price - middleBand), 2))
            .Average();

        var standardDeviation = (decimal)Math.Sqrt(variance);

        // Calculate bands
        var bandWidth = standardDeviation * _standardDeviations;
        var upperBand = middleBand + bandWidth;
        var lowerBand = middleBand - bandWidth;

        return new BollingerBandsResult(
            upperBand: upperBand,
            middleBand: middleBand,
            lowerBand: lowerBand,
            startTime: prices[0].Timestamp,
            endTime: prices[_period - 1].Timestamp
        );
    }
}

namespace AkashTrends.Core.Analysis.Indicators;

public class IndicatorFactory : IIndicatorFactory
{
    private readonly Dictionary<IndicatorType, IndicatorDescription> _descriptions;
    private readonly Dictionary<IndicatorType, (int MinPeriod, int MaxPeriod)> _periodRanges;

    public IndicatorFactory()
    {
        _descriptions = new Dictionary<IndicatorType, IndicatorDescription>
        {
            [IndicatorType.SimpleMovingAverage] = new IndicatorDescription(
                "Simple Moving Average",
                "SMA",
                "Calculates the arithmetic mean of prices over a specified period"
            ),
            [IndicatorType.ExponentialMovingAverage] = new IndicatorDescription(
                "Exponential Moving Average",
                "EMA",
                "Calculates a weighted moving average that gives more importance to recent prices"
            ),
            [IndicatorType.RelativeStrengthIndex] = new IndicatorDescription(
                "Relative Strength Index",
                "RSI",
                "Measures the speed and magnitude of recent price changes to evaluate overbought or oversold conditions"
            ),
            [IndicatorType.BollingerBands] = new IndicatorDescription(
                "Bollinger Bands",
                "BB",
                "Shows price volatility and potential overbought/oversold levels using standard deviations around a moving average"
            ),
            [IndicatorType.StochasticOscillator] = new IndicatorDescription(
                "Stochastic Oscillator",
                "STOCH",
                "Compares the current price to its price range over a period to identify overbought/oversold conditions"
            ),
            [IndicatorType.MACD] = new IndicatorDescription(
                "MACD",
                "MACD",
                "Moving Average Convergence Divergence - shows the relationship between fast and slow exponential moving averages"
            ),
            [IndicatorType.WilliamsPercentR] = new IndicatorDescription(
                "Williams %R",
                "%R",
                "A momentum oscillator that measures overbought and oversold levels on a scale of -100 to 0"
            )
        };

        _periodRanges = new Dictionary<IndicatorType, (int MinPeriod, int MaxPeriod)>
        {
            [IndicatorType.SimpleMovingAverage] = (5, 20),
            [IndicatorType.ExponentialMovingAverage] = (12, 26),
            [IndicatorType.RelativeStrengthIndex] = (9, 25),
            [IndicatorType.BollingerBands] = (10, 50),
            [IndicatorType.StochasticOscillator] = (5, 21),
            [IndicatorType.MACD] = (26, 26), // MACD typically uses fixed periods, but we use period for slow EMA
            [IndicatorType.WilliamsPercentR] = (10, 20)
        };
    }

    public IIndicator CreateIndicator(IndicatorType type, int period)
    {
        if (period <= 0)
        {
            throw new ArgumentException("Period must be greater than 0", nameof(period));
        }

        return type switch
        {
            IndicatorType.SimpleMovingAverage => new SimpleMovingAverage(period),
            IndicatorType.ExponentialMovingAverage => new ExponentialMovingAverage(period),
            IndicatorType.RelativeStrengthIndex => new RelativeStrengthIndex(period),
            IndicatorType.BollingerBands => new BollingerBands(period),
            IndicatorType.StochasticOscillator => new StochasticOscillator(period),
            IndicatorType.MACD => new MACD(), // MACD uses default periods (12, 26, 9)
            IndicatorType.WilliamsPercentR => new WilliamsPercentR(period),
            _ => throw new ArgumentException($"Unknown indicator type: {type}", nameof(type))
        };
    }

    public IEnumerable<IndicatorType> GetAvailableIndicators() =>
        _descriptions.Keys;

    public IndicatorDescription GetIndicatorDescription(IndicatorType type)
    {
        if (!_descriptions.TryGetValue(type, out var description))
        {
            throw new ArgumentException($"Unknown indicator type: {type}", nameof(type));
        }

        return description;
    }

    public (int MinPeriod, int MaxPeriod) GetDefaultPeriodRange(IndicatorType type)
    {
        if (!_periodRanges.TryGetValue(type, out var range))
        {
            throw new ArgumentException($"Unknown indicator type: {type}", nameof(type));
        }

        return range;
    }
}

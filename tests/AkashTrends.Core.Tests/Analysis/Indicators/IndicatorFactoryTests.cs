using AkashTrends.Core.Analysis.Indicators;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Analysis.Indicators;

public class IndicatorFactoryTests
{
    private readonly IndicatorFactory _factory;

    public IndicatorFactoryTests()
    {
        _factory = new IndicatorFactory();
    }

    [Theory]
    [InlineData(IndicatorType.SimpleMovingAverage, typeof(SimpleMovingAverage))]
    [InlineData(IndicatorType.ExponentialMovingAverage, typeof(ExponentialMovingAverage))]
    [InlineData(IndicatorType.RelativeStrengthIndex, typeof(RelativeStrengthIndex))]
    [InlineData(IndicatorType.BollingerBands, typeof(BollingerBands))]
    [InlineData(IndicatorType.StochasticOscillator, typeof(StochasticOscillator))]
    public void CreateIndicator_WithValidType_ShouldReturnCorrectInstance(IndicatorType type, Type expectedType)
    {
        // Arrange
        var period = 14;

        // Act
        var indicator = _factory.CreateIndicator(type, period);

        // Assert
        indicator.Should().BeOfType(expectedType);
    }

    [Fact]
    public void CreateIndicator_WithInvalidPeriod_ShouldThrowArgumentException()
    {
        // Arrange
        var invalidPeriod = 0;

        // Act
        var act = () => _factory.CreateIndicator(IndicatorType.SimpleMovingAverage, invalidPeriod);

        // Assert
        act.Should().Throw<ArgumentException>()
           .WithMessage("Period must be greater than 0*");
    }

    [Fact]
    public void GetAvailableIndicators_ShouldReturnAllRegisteredTypes()
    {
        // Act
        var types = _factory.GetAvailableIndicators();

        // Assert
        types.Should().BeEquivalentTo(new[]
        {
            IndicatorType.SimpleMovingAverage,
            IndicatorType.ExponentialMovingAverage,
            IndicatorType.RelativeStrengthIndex,
            IndicatorType.BollingerBands,
            IndicatorType.StochasticOscillator
        });
    }

    [Fact]
    public void GetIndicatorDescription_ShouldReturnValidDescription()
    {
        // Act
        var description = _factory.GetIndicatorDescription(IndicatorType.SimpleMovingAverage);

        // Assert
        description.Name.Should().Be("Simple Moving Average");
        description.ShortName.Should().Be("SMA");
        description.Description.Should().NotBeNullOrWhiteSpace();
    }

    [Theory]
    [InlineData(IndicatorType.SimpleMovingAverage, 5, 20)]
    [InlineData(IndicatorType.ExponentialMovingAverage, 12, 26)]
    [InlineData(IndicatorType.RelativeStrengthIndex, 9, 25)]
    [InlineData(IndicatorType.BollingerBands, 10, 50)]
    [InlineData(IndicatorType.StochasticOscillator, 5, 21)]
    public void GetDefaultPeriodRange_ShouldReturnValidRange(IndicatorType type, int expectedMin, int expectedMax)
    {
        // Act
        var (min, max) = _factory.GetDefaultPeriodRange(type);

        // Assert
        min.Should().Be(expectedMin);
        max.Should().Be(expectedMax);
    }
}

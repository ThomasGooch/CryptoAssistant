using AkashTrends.Application.Features.Crypto.GetAvailableIndicators;
using AkashTrends.Core.Analysis.Indicators;
using NSubstitute;
using Xunit;

namespace AkashTrends.Application.Tests.Features.Crypto.GetAvailableIndicators;

public class GetAvailableIndicatorsQueryHandlerTests
{
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly GetAvailableIndicatorsQueryHandler _handler;

    public GetAvailableIndicatorsQueryHandlerTests()
    {
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _handler = new GetAvailableIndicatorsQueryHandler(_indicatorFactory);
    }

    [Fact]
    public async Task Handle_ReturnsAvailableIndicators()
    {
        // Arrange
        var expectedIndicators = new[]
        {
            IndicatorType.SMA,
            IndicatorType.EMA,
            IndicatorType.RSI
        };

        _indicatorFactory.GetAvailableIndicators().Returns(expectedIndicators);

        // Act
        var result = await _handler.Handle(new GetAvailableIndicatorsQuery());

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedIndicators.Length, result.Indicators.Count);
        Assert.Equal(expectedIndicators, result.Indicators);

        // Verify service calls
        _indicatorFactory.Received(1).GetAvailableIndicators();
    }

    [Fact]
    public async Task Handle_WhenNoIndicatorsAvailable_ReturnsEmptyList()
    {
        // Arrange
        _indicatorFactory.GetAvailableIndicators().Returns(Array.Empty<IndicatorType>());

        // Act
        var result = await _handler.Handle(new GetAvailableIndicatorsQuery());

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Indicators);

        // Verify service calls
        _indicatorFactory.Received(1).GetAvailableIndicators();
    }
}

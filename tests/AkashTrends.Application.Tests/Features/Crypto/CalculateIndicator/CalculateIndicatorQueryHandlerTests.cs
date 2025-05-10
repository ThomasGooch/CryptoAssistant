using AkashTrends.Application.Features.Crypto.CalculateIndicator;
using AkashTrends.Core.Analysis.Indicators;
using AkashTrends.Core.Domain;
using AkashTrends.Core.Exceptions;
using AkashTrends.Core.Services;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace AkashTrends.Application.Tests.Features.Crypto.CalculateIndicator;

public class CalculateIndicatorQueryHandlerTests
{
    private readonly ICryptoExchangeService _exchangeService;
    private readonly IIndicatorFactory _indicatorFactory;
    private readonly CalculateIndicatorQueryHandler _handler;

    public CalculateIndicatorQueryHandlerTests()
    {
        _exchangeService = Substitute.For<ICryptoExchangeService>();
        _indicatorFactory = Substitute.For<IIndicatorFactory>();
        _handler = new CalculateIndicatorQueryHandler(_exchangeService, _indicatorFactory);
    }

    [Fact]
    public async Task Handle_ValidParameters_ReturnsIndicatorResult()
    {
        // Arrange
        var symbol = "BTC";
        var type = IndicatorType.SMA;
        var period = 14;
        var endTime = DateTimeOffset.UtcNow;
        var startTime = endTime.AddDays(-period);

        var query = new CalculateIndicatorQuery
        {
            Symbol = symbol,
            Type = type,
            Period = period
        };

        var prices = new List<CryptoPrice>
        {
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 50000m, startTime.AddDays(1)),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 51000m, startTime.AddDays(2)),
            CryptoPrice.Create(CryptoCurrency.Create(symbol), 52000m, startTime.AddDays(3))
        };

        var indicator = Substitute.For<IIndicator>();
        var indicatorResult = new IndicatorResult(51000m, startTime, endTime);

        _exchangeService.GetHistoricalPricesAsync(symbol, Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>())
            .Returns(prices);

        _indicatorFactory.CreateIndicator(type, period).Returns(indicator);
        indicator.Calculate(prices).Returns(indicatorResult);

        // Act
        var result = await _handler.Handle(query);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(symbol, result.Symbol);
        Assert.Equal(type, result.Type);
        Assert.Equal(indicatorResult.Value, result.Value);
        Assert.Equal(indicatorResult.StartTime, result.StartTime);
        Assert.Equal(indicatorResult.EndTime, result.EndTime);

        // Verify service calls
        await _exchangeService.Received(1).GetHistoricalPricesAsync(
            symbol, 
            Arg.Any<DateTimeOffset>(), 
            Arg.Any<DateTimeOffset>());
        _indicatorFactory.Received(1).CreateIndicator(type, period);
        indicator.Received(1).Calculate(prices);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task Handle_InvalidSymbol_ThrowsValidationException(string invalidSymbol)
    {
        // Arrange
        var query = new CalculateIndicatorQuery
        {
            Symbol = invalidSymbol,
            Type = IndicatorType.SMA,
            Period = 14
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _handler.Handle(query));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_InvalidPeriod_ThrowsValidationException(int invalidPeriod)
    {
        // Arrange
        var query = new CalculateIndicatorQuery
        {
            Symbol = "BTC",
            Type = IndicatorType.SMA,
            Period = invalidPeriod
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => _handler.Handle(query));
    }

    [Fact]
    public async Task Handle_ExchangeServiceThrowsException_PropagatesException()
    {
        // Arrange
        var query = new CalculateIndicatorQuery
        {
            Symbol = "BTC",
            Type = IndicatorType.SMA,
            Period = 14
        };

        var expectedException = new ExchangeException("API error");
        _exchangeService.GetHistoricalPricesAsync(
                Arg.Any<string>(),
                Arg.Any<DateTimeOffset>(),
                Arg.Any<DateTimeOffset>())
            .Throws(expectedException);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ExchangeException>(() => _handler.Handle(query));
        Assert.Same(expectedException, exception);
    }

    [Fact]
    public async Task Handle_IndicatorFactoryThrowsException_PropagatesException()
    {
        // Arrange
        var query = new CalculateIndicatorQuery
        {
            Symbol = "BTC",
            Type = IndicatorType.SMA,
            Period = 14
        };

        var expectedException = new InvalidOperationException("Invalid indicator type");
        _indicatorFactory.CreateIndicator(Arg.Any<IndicatorType>(), Arg.Any<int>())
            .Throws(expectedException);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _handler.Handle(query));
        Assert.Same(expectedException, exception);
    }
}

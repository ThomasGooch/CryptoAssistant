using AkashTrends.Application.Common.CQRS;
using NSubstitute;
using Xunit;

namespace AkashTrends.Application.Tests.Common.CQRS;

public class QueryDispatcherTests
{
    private readonly IServiceProvider _serviceProvider;
    private readonly QueryDispatcher _dispatcher;

    public QueryDispatcherTests()
    {
        _serviceProvider = Substitute.For<IServiceProvider>();
        _dispatcher = new QueryDispatcher(_serviceProvider);
    }

    [Fact]
    public async Task Dispatch_GetsHandlerFromServiceProvider_AndCallsHandle()
    {
        // Arrange
        var query = new TestQuery();
        var expectedResult = new TestResult { Value = "Test Result" };
        var handler = Substitute.For<IQueryHandler<TestQuery, TestResult>>();

        handler.Handle(query).Returns(Task.FromResult(expectedResult));
        _serviceProvider.GetService(typeof(IQueryHandler<TestQuery, TestResult>)).Returns(handler);

        // Act
        var result = await _dispatcher.Dispatch<TestQuery, TestResult>(query);

        // Assert
        Assert.Equal(expectedResult, result);
        await handler.Received(1).Handle(query);
    }

    [Fact]
    public async Task Dispatch_HandlerNotFound_ThrowsInvalidOperationException()
    {
        // Arrange
        var query = new TestQuery();
        _serviceProvider.GetService(typeof(IQueryHandler<TestQuery, TestResult>)).Returns(null);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _dispatcher.Dispatch<TestQuery, TestResult>(query));
    }

    public class TestQuery : IQuery<TestResult>
    {
    }

    public class TestResult
    {
        public string Value { get; set; } = string.Empty;
    }
}

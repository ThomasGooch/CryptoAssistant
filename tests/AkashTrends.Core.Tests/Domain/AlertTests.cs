using AkashTrends.Core.Domain;
using FluentAssertions;
using Xunit;

namespace AkashTrends.Core.Tests.Domain;

public class AlertTests
{
    [Fact]
    public void Create_WithValidParameters_ShouldCreateAlert()
    {
        // Arrange
        var userId = "testUser123";
        var symbol = "BTC";
        var threshold = 50000m;
        var condition = AlertCondition.Above;
        var title = "BTC High Alert";
        var message = "BTC has exceeded $50,000";

        // Act
        var alert = Alert.Create(userId, symbol, threshold, condition, title, message);

        // Assert
        alert.Should().NotBeNull();
        alert.Id.Should().NotBeEmpty();
        alert.UserId.Should().Be(userId);
        alert.Symbol.Should().Be(symbol);
        alert.Threshold.Should().Be(threshold);
        alert.Condition.Should().Be(condition);
        alert.Title.Should().Be(title);
        alert.Message.Should().Be(message);
        alert.IsActive.Should().BeTrue();
        alert.IsTriggered.Should().BeFalse();
        alert.CreatedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(1));
        alert.TriggeredAt.Should().BeNull();
        alert.TriggeredPrice.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidUserId_ShouldThrowArgumentException(string? userId)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Alert.Create(userId, "BTC", 50000m, AlertCondition.Above, "Title", "Message"));
        exception.Message.Should().Contain("User ID cannot be empty or null");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidSymbol_ShouldThrowArgumentException(string? symbol)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Alert.Create("user123", symbol, 50000m, AlertCondition.Above, "Title", "Message"));
        exception.Message.Should().Contain("Symbol cannot be empty or null");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public void Create_WithInvalidThreshold_ShouldThrowArgumentException(decimal threshold)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Alert.Create("user123", "BTC", threshold, AlertCondition.Above, "Title", "Message"));
        exception.Message.Should().Contain("Threshold must be greater than 0");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidTitle_ShouldThrowArgumentException(string? title)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, title, "Message"));
        exception.Message.Should().Contain("Title cannot be empty or null");
    }

    [Fact]
    public void Trigger_WhenNotTriggered_ShouldSetTriggeredState()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        var triggerPrice = 55000m;

        // Act
        alert.Trigger(triggerPrice);

        // Assert
        alert.IsTriggered.Should().BeTrue();
        alert.TriggeredPrice.Should().Be(triggerPrice);
        alert.TriggeredAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void Trigger_WhenAlreadyTriggered_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        alert.Trigger(55000m);

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() => alert.Trigger(60000m));
        exception.Message.Should().Contain("Alert has already been triggered");
    }

    [Fact]
    public void Trigger_WhenInactive_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        alert.Deactivate();

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() => alert.Trigger(55000m));
        exception.Message.Should().Contain("Cannot trigger inactive alert");
    }

    [Fact]
    public void Deactivate_ShouldSetIsActiveToFalse()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");

        // Act
        alert.Deactivate();

        // Assert
        alert.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Activate_ShouldSetIsActiveToTrue()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        alert.Deactivate();

        // Act
        alert.Activate();

        // Assert
        alert.IsActive.Should().BeTrue();
    }

    [Fact]
    public void Reset_WhenTriggered_ShouldResetTriggeredState()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        alert.Trigger(55000m);

        // Act
        alert.Reset();

        // Assert
        alert.IsTriggered.Should().BeFalse();
        alert.TriggeredPrice.Should().BeNull();
        alert.TriggeredAt.Should().BeNull();
    }

    [Theory]
    [InlineData(55000, AlertCondition.Above, 50000, true)]   // 55k > 50k
    [InlineData(45000, AlertCondition.Above, 50000, false)]  // 45k not > 50k
    [InlineData(45000, AlertCondition.Below, 50000, true)]   // 45k < 50k
    [InlineData(55000, AlertCondition.Below, 50000, false)]  // 55k not < 50k
    [InlineData(50000, AlertCondition.Above, 50000, false)]  // 50k not > 50k (equal)
    [InlineData(50000, AlertCondition.Below, 50000, false)]  // 50k not < 50k (equal)
    public void ShouldTrigger_WithDifferentConditions_ShouldReturnCorrectResult(
        decimal currentPrice, AlertCondition condition, decimal threshold, bool expected)
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", threshold, condition, "Title", "Message");

        // Act
        var result = alert.ShouldTrigger(currentPrice);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void ShouldTrigger_WhenInactive_ShouldReturnFalse()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        alert.Deactivate();

        // Act
        var result = alert.ShouldTrigger(55000m);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ShouldTrigger_WhenAlreadyTriggered_ShouldReturnFalse()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        alert.Trigger(55000m);

        // Act
        var result = alert.ShouldTrigger(60000m);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void UpdateTitle_WithValidTitle_ShouldUpdateTitle()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Old Title", "Message");
        var newTitle = "New Title";

        // Act
        alert.UpdateTitle(newTitle);

        // Assert
        alert.Title.Should().Be(newTitle);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void UpdateTitle_WithInvalidTitle_ShouldThrowArgumentException(string? newTitle)
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => alert.UpdateTitle(newTitle));
        exception.Message.Should().Contain("Title cannot be empty or null");
    }

    [Fact]
    public void UpdateMessage_WithValidMessage_ShouldUpdateMessage()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Old Message");
        var newMessage = "New Message";

        // Act
        alert.UpdateMessage(newMessage);

        // Assert
        alert.Message.Should().Be(newMessage);
    }

    [Fact]
    public void UpdateThreshold_WithValidThreshold_ShouldUpdateThresholdAndResetIfTriggered()
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");
        alert.Trigger(55000m);
        var newThreshold = 60000m;

        // Act
        alert.UpdateThreshold(newThreshold);

        // Assert
        alert.Threshold.Should().Be(newThreshold);
        alert.IsTriggered.Should().BeFalse();
        alert.TriggeredPrice.Should().BeNull();
        alert.TriggeredAt.Should().BeNull();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void UpdateThreshold_WithInvalidThreshold_ShouldThrowArgumentException(decimal newThreshold)
    {
        // Arrange
        var alert = Alert.Create("user123", "BTC", 50000m, AlertCondition.Above, "Title", "Message");

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => alert.UpdateThreshold(newThreshold));
        exception.Message.Should().Contain("Threshold must be greater than 0");
    }
}

public class AlertConditionTests
{
    [Fact]
    public void AlertCondition_ShouldHaveCorrectValues()
    {
        // Assert
        ((int)AlertCondition.Above).Should().Be(0);
        ((int)AlertCondition.Below).Should().Be(1);
    }
}
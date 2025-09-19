namespace AkashTrends.Core.Domain;

public class Alert
{
    public Guid Id { get; private set; }
    public string UserId { get; private set; }
    public string Symbol { get; private set; }
    public decimal Threshold { get; private set; }
    public AlertCondition Condition { get; private set; }
    public string Title { get; private set; }
    public string Message { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsTriggered { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? TriggeredAt { get; private set; }
    public decimal? TriggeredPrice { get; private set; }
    public int? CooldownSeconds { get; private set; }

    private Alert(
        string userId,
        string symbol,
        decimal threshold,
        AlertCondition condition,
        string title,
        string message,
        int? cooldownSeconds = null)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("User ID cannot be empty or null", nameof(userId));

        if (string.IsNullOrWhiteSpace(symbol))
            throw new ArgumentException("Symbol cannot be empty or null", nameof(symbol));

        if (threshold <= 0)
            throw new ArgumentException("Threshold must be greater than 0", nameof(threshold));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title cannot be empty or null", nameof(title));

        if (string.IsNullOrWhiteSpace(message))
            throw new ArgumentException("Message cannot be empty or null", nameof(message));

        Id = Guid.NewGuid();
        UserId = userId.Trim();
        Symbol = symbol.Trim().ToUpperInvariant();
        Threshold = threshold;
        Condition = condition;
        Title = title.Trim();
        Message = message.Trim();
        IsActive = true;
        IsTriggered = false;
        CreatedAt = DateTimeOffset.UtcNow;
        TriggeredAt = null;
        TriggeredPrice = null;
        CooldownSeconds = cooldownSeconds;
    }

    public static Alert Create(
        string userId,
        string symbol,
        decimal threshold,
        AlertCondition condition,
        string title,
        string message,
        int? cooldownSeconds = null)
    {
        return new Alert(userId, symbol, threshold, condition, title, message, cooldownSeconds);
    }

    public void Trigger(decimal currentPrice)
    {
        if (IsTriggered)
            throw new InvalidOperationException("Alert has already been triggered");

        if (!IsActive)
            throw new InvalidOperationException("Cannot trigger inactive alert");

        IsTriggered = true;
        TriggeredPrice = currentPrice;
        TriggeredAt = DateTimeOffset.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }

    public void Reset()
    {
        IsTriggered = false;
        TriggeredPrice = null;
        TriggeredAt = null;
    }

    public bool ShouldTrigger(decimal currentPrice)
    {
        if (!IsActive || IsTriggered)
            return false;

        return Condition switch
        {
            AlertCondition.Above => currentPrice > Threshold,
            AlertCondition.Below => currentPrice < Threshold,
            _ => false
        };
    }

    public void UpdateTitle(string newTitle)
    {
        if (string.IsNullOrWhiteSpace(newTitle))
            throw new ArgumentException("Title cannot be empty or null", nameof(newTitle));

        Title = newTitle.Trim();
    }

    public void UpdateMessage(string newMessage)
    {
        if (string.IsNullOrWhiteSpace(newMessage))
            throw new ArgumentException("Message cannot be empty or null", nameof(newMessage));

        Message = newMessage.Trim();
    }

    public void UpdateThreshold(decimal newThreshold)
    {
        if (newThreshold <= 0)
            throw new ArgumentException("Threshold must be greater than 0", nameof(newThreshold));

        Threshold = newThreshold;

        // Reset trigger state when threshold changes
        if (IsTriggered)
        {
            Reset();
        }
    }

    public void UpdateCooldown(int? cooldownSeconds)
    {
        if (cooldownSeconds.HasValue && cooldownSeconds.Value < 0)
            throw new ArgumentException("Cooldown seconds cannot be negative", nameof(cooldownSeconds));

        CooldownSeconds = cooldownSeconds;
    }
}

public enum AlertCondition
{
    Above = 0,
    Below = 1
}
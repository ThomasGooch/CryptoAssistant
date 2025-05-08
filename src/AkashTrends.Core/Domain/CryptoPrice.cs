namespace AkashTrends.Core.Domain;

public class CryptoPrice
{
    private const decimal MaximumPrice = 1_000_000_000_000m; // 1 trillion

    public CryptoCurrency Currency { get; }
    public decimal Value { get; }
    public DateTimeOffset Timestamp { get; }

    private CryptoPrice(CryptoCurrency currency, decimal price, DateTimeOffset timestamp)
    {
        Currency = currency;
        Value = price;
        Timestamp = timestamp;
    }

    public static CryptoPrice Create(CryptoCurrency currency, decimal price, DateTimeOffset timestamp)
    {
        ArgumentNullException.ThrowIfNull(currency);

        if (price < 0)
        {
            throw new ArgumentException("Price cannot be negative", nameof(price));
        }

        if (price > MaximumPrice)
        {
            throw new ArgumentException("Price exceeds maximum allowed value", nameof(price));
        }

        return new CryptoPrice(currency, price, timestamp);
    }
}

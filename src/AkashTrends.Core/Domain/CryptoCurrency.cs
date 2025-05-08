namespace AkashTrends.Core.Domain;

public class CryptoCurrency
{
    public string Symbol { get; }

    private CryptoCurrency(string symbol)
    {
        Symbol = symbol;
    }

    public static CryptoCurrency Create(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Cryptocurrency symbol cannot be empty or null", nameof(symbol));
        }

        return new CryptoCurrency(symbol);
    }
}

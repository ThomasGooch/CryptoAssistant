interface AssetData {
  symbol: string;
  price: number;
  timestamp: string;
  priceChange24h?: number;
  percentChange24h?: number;
}

interface PortfolioSummaryProps {
  assetData: Map<string, AssetData>;
  isLoading: boolean;
}

export function PortfolioSummary({ assetData, isLoading }: PortfolioSummaryProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const assets = Array.from(assetData.values());
  
  if (assets.length === 0) {
    return null;
  }

  // Calculate portfolio metrics
  const totalAssets = assets.length;
  
  const assetsWithChange = assets.filter(asset => asset.percentChange24h !== undefined);
  const avgPercentChange = assetsWithChange.length > 0 
    ? assetsWithChange.reduce((sum, asset) => sum + (asset.percentChange24h || 0), 0) / assetsWithChange.length
    : 0;

  const gainers = assetsWithChange.filter(asset => (asset.percentChange24h || 0) > 0).length;
  const losers = assetsWithChange.filter(asset => (asset.percentChange24h || 0) < 0).length;

  // Find best and worst performers
  const bestPerformer = assetsWithChange.reduce((best, current) => 
    (current.percentChange24h || 0) > (best.percentChange24h || 0) ? current : best
  , assetsWithChange[0]);

  const worstPerformer = assetsWithChange.reduce((worst, current) => 
    (current.percentChange24h || 0) < (worst.percentChange24h || 0) ? current : worst
  , assetsWithChange[0]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalAssets}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Assets
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {gainers}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Gainers (24h)
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {losers}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Losers (24h)
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className={`text-2xl font-bold ${
            avgPercentChange >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {avgPercentChange >= 0 ? '+' : ''}{avgPercentChange.toFixed(2)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Avg Change (24h)
          </div>
        </div>
      </div>

      {/* Best/Worst Performers */}
      {assetsWithChange.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {bestPerformer && (
            <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                Best Performer (24h)
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-green-900 dark:text-green-100">
                    {bestPerformer.symbol}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    ${bestPerformer.price.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600 dark:text-green-400">
                    +{(bestPerformer.percentChange24h || 0).toFixed(2)}%
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    +${(bestPerformer.priceChange24h || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {worstPerformer && worstPerformer !== bestPerformer && (
            <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                Worst Performer (24h)
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-red-900 dark:text-red-100">
                    {worstPerformer.symbol}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    ${worstPerformer.price.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600 dark:text-red-400">
                    {(worstPerformer.percentChange24h || 0).toFixed(2)}%
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    ${(worstPerformer.priceChange24h || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Asset List */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2">Asset</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">24h Change</th>
              <th className="text-right py-2">24h %</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.symbol} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3">
                  <div className="font-medium">{asset.symbol}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(asset.timestamp).toLocaleTimeString()}
                  </div>
                </td>
                <td className="text-right py-3 font-medium">
                  ${asset.price.toFixed(2)}
                </td>
                <td className={`text-right py-3 font-medium ${
                  (asset.priceChange24h || 0) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {asset.priceChange24h !== undefined 
                    ? `${asset.priceChange24h >= 0 ? '+' : ''}$${asset.priceChange24h.toFixed(2)}`
                    : 'N/A'
                  }
                </td>
                <td className={`text-right py-3 font-medium ${
                  (asset.percentChange24h || 0) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {asset.percentChange24h !== undefined 
                    ? `${asset.percentChange24h >= 0 ? '+' : ''}${asset.percentChange24h.toFixed(2)}%`
                    : 'N/A'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
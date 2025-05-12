import React from 'react';

interface PriceDisplayProps {
  symbol: string;
  price: number;
  timestamp?: string;
  isLoading?: boolean;
}

/**
 * Component for displaying cryptocurrency price
 */
const PriceDisplay: React.FC<PriceDisplayProps> = ({ 
  symbol, 
  price, 
  timestamp, 
  isLoading = false 
}) => {
  // Format price with commas and 2 decimal places
  const formattedPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);

  // Format timestamp if provided
  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleTimeString() 
    : '';

  // Show empty state if no symbol
  if (!symbol.trim()) {
    return (
      <div className="crypto-card">
        <div className="text-gray-500 dark:text-gray-400 text-center py-4">
          Enter a cryptocurrency symbol to view price
        </div>
      </div>
    );
  }

  return (
    <div className="crypto-card">
      {isLoading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{symbol}</h3>
            {timestamp && (
              <span className="text-xs text-gray-500">{formattedTime}</span>
            )}
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold">${formattedPrice}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default PriceDisplay;

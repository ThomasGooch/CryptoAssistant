import { useState } from "react";

interface MultiSymbolSelectorProps {
  selectedSymbols: string[];
  onSymbolsChange: (symbols: string[]) => void;
  maxSymbols?: number;
}

const POPULAR_SYMBOLS = [
  "BTC", "ETH", "ADA", "XRP", "DOT", "LINK", "LTC", "BCH", "BNB", "SOL",
  "AVAX", "MATIC", "UNI", "DOGE", "SHIB", "ATOM", "XLM", "VET", "FIL", "TRX"
];

export function MultiSymbolSelector({ 
  selectedSymbols, 
  onSymbolsChange, 
  maxSymbols = 6 
}: MultiSymbolSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleAddSymbol = (symbol: string) => {
    const upperSymbol = symbol.toUpperCase().trim();
    
    if (!upperSymbol) return;
    
    if (selectedSymbols.includes(upperSymbol)) {
      // Symbol already selected, show feedback
      return;
    }
    
    if (selectedSymbols.length >= maxSymbols) {
      // Max symbols reached, show feedback
      return;
    }
    
    onSymbolsChange([...selectedSymbols, upperSymbol]);
    setInputValue("");
    setIsDropdownOpen(false);
  };

  const handleRemoveSymbol = (symbolToRemove: string) => {
    onSymbolsChange(selectedSymbols.filter(symbol => symbol !== symbolToRemove));
  };

  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSymbol(inputValue);
    }
  };

  const handlePopularSymbolClick = (symbol: string) => {
    handleAddSymbol(symbol);
  };

  const filteredPopularSymbols = POPULAR_SYMBOLS.filter(
    symbol => !selectedSymbols.includes(symbol) && 
    symbol.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Selected Symbols Display */}
      <div className="flex flex-wrap gap-2">
        {selectedSymbols.map((symbol) => (
          <div
            key={symbol}
            className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
          >
            <span className="font-medium">{symbol}</span>
            <button
              onClick={() => handleRemoveSymbol(symbol)}
              className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors"
              title={`Remove ${symbol}`}
            >
              ×
            </button>
          </div>
        ))}
        
        {selectedSymbols.length === 0 && (
          <div className="text-gray-500 text-sm italic">
            No symbols selected. Add symbols below.
          </div>
        )}
      </div>

      {/* Symbol Input */}
      <div className="relative">
        <div className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsDropdownOpen(true);
            }}
            onKeyPress={handleInputKeyPress}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Enter symbol (e.g., BTC) or select from popular symbols"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={selectedSymbols.length >= maxSymbols}
          />
          <button
            onClick={() => handleAddSymbol(inputValue)}
            disabled={!inputValue.trim() || selectedSymbols.length >= maxSymbols}
            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>

        {/* Dropdown with popular symbols */}
        {isDropdownOpen && inputValue && filteredPopularSymbols.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-32 overflow-y-auto">
            {filteredPopularSymbols.slice(0, 5).map((symbol) => (
              <button
                key={symbol}
                onClick={() => handlePopularSymbolClick(symbol)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {symbol}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Symbols Quick Select */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Popular Symbols:
        </h4>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SYMBOLS.filter(symbol => !selectedSymbols.includes(symbol))
            .slice(0, 10)
            .map((symbol) => (
            <button
              key={symbol}
              onClick={() => handlePopularSymbolClick(symbol)}
              disabled={selectedSymbols.length >= maxSymbols}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {selectedSymbols.length >= maxSymbols && (
          <div className="text-orange-600 dark:text-orange-400">
            Maximum {maxSymbols} symbols selected. Remove a symbol to add another.
          </div>
        )}
        {selectedSymbols.length > 0 && selectedSymbols.length < maxSymbols && (
          <div>
            {selectedSymbols.length} of {maxSymbols} symbols selected.
          </div>
        )}
      </div>
    </div>
  );
}
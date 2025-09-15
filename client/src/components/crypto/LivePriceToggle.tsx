import { useState } from 'react';

interface LivePriceToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isConnected?: boolean;
  className?: string;
}

export const LivePriceToggle: React.FC<LivePriceToggleProps> = ({
  enabled,
  onToggle,
  isConnected = false,
  className = ''
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      onToggle(!enabled);
    } finally {
      // Add a small delay to show the loading state
      setTimeout(() => setIsToggling(false), 300);
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Live Updates
      </span>
      
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled 
            ? 'bg-blue-600' 
            : 'bg-gray-200 dark:bg-gray-700'
        } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={enabled ? 'Disable live price updates' : 'Enable live price updates'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
        
        {/* Loading indicator */}
        {isToggling && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-3 w-3 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </button>

      {/* Connection Status */}
      {enabled && (
        <div className="flex items-center space-x-1">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className={`text-xs ${
            isConnected 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      )}

      {/* Info tooltip */}
      <div className="relative group">
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-sm tooltip opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
          {enabled 
            ? 'Real-time price updates via WebSocket connection' 
            : 'Historical data only, refreshed periodically'
          }
          <div className="tooltip-arrow"></div>
        </div>
      </div>
      
      <style>{`
        .tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #374151 transparent transparent transparent;
        }
      `}</style>
    </div>
  );
};
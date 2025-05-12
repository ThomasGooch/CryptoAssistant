import { useEffect, useState } from 'react';
import Layout from './components/common/Layout';
import PriceDisplay from './components/crypto/PriceDisplay';
import IndicatorDisplay from './components/indicators/IndicatorDisplay';
import { cryptoService } from './services/cryptoService';
import { indicatorService } from './services/indicatorService';
import { useSignalR } from './hooks/useSignalR';
import { IndicatorType } from './types/domain';
import './App.css';

function App() {
  // State for cryptocurrency data
  const [symbol, setSymbol] = useState('BTC');
  const [price, setPrice] = useState(0);
  const [timestamp, setTimestamp] = useState('');
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  
  // State for indicator data
  const [indicatorType, setIndicatorType] = useState(IndicatorType.SimpleMovingAverage);
  const [indicatorValue, setIndicatorValue] = useState(0);
  const [period, setPeriod] = useState(14);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLoadingIndicator, setIsLoadingIndicator] = useState(true);
  const [availableIndicators, setAvailableIndicators] = useState<IndicatorType[]>([]);
  
  // State for real-time updates
  const [hasInitialData, setHasInitialData] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'disconnected'>('disconnected');

  // Get SignalR hook
  const { 
    isConnected, 
    error: signalRError, 
    subscribeToPriceUpdates,
    subscribeToIndicatorUpdates
  } = useSignalR();

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else if (signalRError) {
      setConnectionStatus('error');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected, signalRError]);

  // Load initial price data
  useEffect(() => {
    // Skip if symbol is empty
    if (!symbol.trim()) {
      setPrice(0);
      setTimestamp('');
      return;
    }

    const fetchPrice = async () => {
      try {
        setIsLoadingPrice(true);
        const priceData = await cryptoService.getCurrentPrice(symbol);
        setPrice(priceData.price);
        setTimestamp(priceData.timestamp);
        setHasInitialData(true);
      } catch (error) {
        console.error('Error fetching price:', error);
        // Reset price on error
        setPrice(0);
        setTimestamp('');
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchPrice();
  }, [symbol]);

  // Load available indicators
  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const response = await indicatorService.getAvailableIndicators();
        setAvailableIndicators(response.indicators);
      } catch (error) {
        console.error('Error fetching indicators:', error);
      }
    };

    fetchIndicators();
  }, []);

  // Load indicator data when type or period changes
  useEffect(() => {
    // Skip if symbol is empty
    if (!symbol.trim()) return;
    const fetchIndicator = async () => {
      try {
        setIsLoadingIndicator(true);
        const indicatorData = await indicatorService.getIndicator(symbol, indicatorType, period);
        setIndicatorValue(indicatorData.value);
        setStartTime(indicatorData.startTime);
        setEndTime(indicatorData.endTime);
      } catch (error) {
        console.error('Error fetching indicator:', error);
      } finally {
        setIsLoadingIndicator(false);
      }
    };

    fetchIndicator();
  }, [symbol, indicatorType, period]);

  // Subscribe to real-time updates when SignalR is connected
  useEffect(() => {
    // Skip if not connected
    if (!isConnected) {
      return;
    }

    let isMounted = true;
    let currentSymbol = symbol.trim();

    const setupSubscriptions = async () => {
      try {
        if (!currentSymbol) {
          // Reset states if symbol is empty
          setPrice(0);
          setTimestamp('');
          setIndicatorValue(0);
          setStartTime('');
          setEndTime('');
          return;
        }

        // Subscribe to price updates
        await subscribeToPriceUpdates(currentSymbol, (newPrice) => {
          if (isMounted) {
            setPrice(newPrice);
            setTimestamp(new Date().toISOString());
          }
        });

        // Subscribe to indicator updates
        await subscribeToIndicatorUpdates(currentSymbol, indicatorType, period, (newValue) => {
          if (isMounted) {
            setIndicatorValue(newValue);
            setEndTime(new Date().toISOString());
          }
        });
      } catch (error) {
        console.error('Error setting up real-time updates:', error);
        // Reset states on error
        if (isMounted) {
          setPrice(0);
          setTimestamp('');
          setIndicatorValue(0);
          setStartTime('');
          setEndTime('');
        }
      }
    };

    setupSubscriptions();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [isConnected, symbol, indicatorType, period, subscribeToPriceUpdates, subscribeToIndicatorUpdates]);

  // Handle symbol change
  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim().toUpperCase();
    setSymbol(newValue);
  };

  // Handle indicator type change
  const handleIndicatorTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIndicatorType(Number(e.target.value) as IndicatorType);
  };

  // Handle period change
  const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPeriod(Number(e.target.value));
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Cryptocurrency Price</h2>
            
            <div className="mb-4">
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Symbol
              </label>
              <input
                type="text"
                id="symbol"
                value={symbol}
                onChange={handleSymbolChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter cryptocurrency symbol (e.g., BTC)"
              />
            </div>
            
            <div className="mt-4">
              <PriceDisplay
                symbol={symbol}
                price={price}
                timestamp={timestamp}
                isLoading={isLoadingPrice}
              />
            </div>
            
            {connectionStatus === 'error' && (
              <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                Real-time updates unavailable: {signalRError?.message}
              </div>
            )}
            
            {connectionStatus === 'connected' && hasInitialData && (
              <div className="mt-4 text-sm text-green-600 dark:text-green-400">
                Real-time updates active
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Technical Indicator</h2>
            
            <div className="mb-4">
              <label htmlFor="indicatorType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Indicator Type
              </label>
              <select
                id="indicatorType"
                value={indicatorType}
                onChange={handleIndicatorTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {availableIndicators.map((type) => (
                  <option key={type} value={type}>
                    {indicatorService.getIndicatorDisplayName(type)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period (days)
              </label>
              <input
                type="number"
                id="period"
                value={period}
                onChange={handlePeriodChange}
                min="1"
                max="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="mt-4">
              <IndicatorDisplay
                symbol={symbol}
                type={indicatorType}
                value={indicatorValue}
                period={period}
                startTime={startTime}
                endTime={endTime}
                isLoading={isLoadingIndicator}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default App

import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PriceChart } from './PriceChart';
import { cryptoService } from '../../services/cryptoService';
import type { HistoricalPrice } from '../../types/domain';
import { Timeframe } from '../../types/domain';

// Mock the cryptoService
vi.mock('../../services/cryptoService');
const mockCryptoService = cryptoService as unknown as { getHistoricalPrices: ReturnType<typeof vi.fn> };

describe('PriceChart', () => {
    const mockHistoricalData: HistoricalPrice[] = [
        { timestamp: new Date('2025-05-14T08:00:00Z'), price: 45000 },
        { timestamp: new Date('2025-05-14T08:15:00Z'), price: 45100 },
        { timestamp: new Date('2025-05-14T08:30:00Z'), price: 45200 }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockCryptoService.getHistoricalPrices).mockResolvedValue({ symbol: 'BTC', timeframe: Timeframe.Hour, prices: mockHistoricalData });
    });

    test('renders chart container', () => {
        render(<PriceChart symbol="BTC" timeframe={Timeframe.Hour} />);
        // Initially shows loading state
        const loadingElement = screen.getByTestId('price-chart-loading');
        expect(loadingElement).toBeInTheDocument();
    });

    test('displays loading state while fetching data', () => {
        render(<PriceChart symbol="BTC" timeframe={Timeframe.Hour} />);
        expect(screen.getByTestId('price-chart-loading')).toBeInTheDocument();
    });

    test('fetches and displays historical price data', async () => {
        const { container } = render(<PriceChart symbol="BTC" timeframe={Timeframe.Hour} />);
        
        await waitFor(() => {
            expect(mockCryptoService.getHistoricalPrices).toHaveBeenCalledWith('BTC', Timeframe.Hour);
        });

        // After loading, the canvas should be visible
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        expect(screen.queryByTestId('price-chart-loading')).not.toBeInTheDocument();
    });

    test('updates chart when timeframe changes', async () => {
        render(<PriceChart symbol="BTC" timeframe={Timeframe.Hour} />);
        
        // Wait for initial load
        await waitFor(() => {
            expect(mockCryptoService.getHistoricalPrices).toHaveBeenCalledWith('BTC', Timeframe.Hour);
        });

        // Change timeframe prop
        render(<PriceChart symbol="BTC" timeframe={Timeframe.Day} />);

        await waitFor(() => {
            expect(mockCryptoService.getHistoricalPrices).toHaveBeenCalledWith('BTC', Timeframe.Day);
        });
    });

    test('displays error state when data fetch fails', async () => {
        const error = new Error('Failed to fetch data');
        vi.mocked(mockCryptoService.getHistoricalPrices).mockRejectedValue(error);

        render(<PriceChart symbol="BTC" timeframe={Timeframe.Hour} />);

        await waitFor(() => {
            expect(screen.getByTestId('price-chart-error')).toBeInTheDocument();
            expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument();
        });
    });

    test('refreshes data periodically', { timeout: 10000 }, async () => {
        // Start with fake timers
        vi.useFakeTimers({ shouldAdvanceTime: true });
        
        const mockHistoricalResponse = { symbol: 'BTC', timeframe: Timeframe.Hour, prices: mockHistoricalData };
        vi.mocked(mockCryptoService.getHistoricalPrices).mockResolvedValue(mockHistoricalResponse);
        
        render(<PriceChart symbol="BTC" timeframe={Timeframe.Hour} />);

        // Wait for initial render to complete
        await vi.advanceTimersByTimeAsync(0);
        
        // Verify initial call
        expect(mockCryptoService.getHistoricalPrices).toHaveBeenCalledTimes(1);
        expect(mockCryptoService.getHistoricalPrices).toHaveBeenLastCalledWith('BTC', Timeframe.Hour);

        // Reset the mock call count
        vi.mocked(mockCryptoService.getHistoricalPrices).mockClear();

        // Advance time by 5 minutes
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

        // Verify the refresh call
        expect(mockCryptoService.getHistoricalPrices).toHaveBeenCalledTimes(1);
        expect(mockCryptoService.getHistoricalPrices).toHaveBeenLastCalledWith('BTC', Timeframe.Hour);

        // Cleanup
        vi.useRealTimers();
    });
});

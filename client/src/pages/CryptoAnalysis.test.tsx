import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CryptoAnalysis } from './CryptoAnalysis';
import { cryptoService } from '../services/cryptoService';
import { indicatorService } from '../services/indicatorService';

// Setup mock data
const mockPrice = {
  symbol: 'BTC',
  price: 45000,
  timestamp: new Date().toISOString()
};

const mockIndicators = { indicators: [0, 1, 2, 3, 4] };

// Mock the services
vi.mock('../services/cryptoService');
vi.mock('../services/indicatorService', () => ({
  indicatorService: {
    getAvailableIndicators: vi.fn(),
    getIndicatorValue: vi.fn(),
    getIndicatorDisplayName: vi.fn().mockReturnValue('Simple Moving Average')
  }
}));

// Mock Chart.js to prevent canvas errors
vi.mock('chart.js', () => ({
  Chart: vi.fn(),
  registerables: []
}));

// Create a configurable SignalR mock
let mockSignalRState = {
  isConnected: true,
  error: null as Error | null
};

// Mock the useSignalR hook
vi.mock('../hooks/useSignalR', () => ({
  useSignalR: vi.fn(() => ({
    isConnected: mockSignalRState.isConnected,
    error: mockSignalRState.error,
    subscribeToPriceUpdates: vi.fn(),
    subscribeToIndicatorUpdates: vi.fn()
  }))
}));

// No additional imports needed

beforeEach(async () => {
  vi.clearAllMocks();
  
  // Reset the SignalR mock state to connected by default
  mockSignalRState = {
    isConnected: true,
    error: null
  };

  vi.mocked(cryptoService.getCurrentPrice).mockResolvedValue(mockPrice);
  vi.mocked(indicatorService.getAvailableIndicators).mockResolvedValue(mockIndicators);

  // Removed act usage for pending promises
  await Promise.resolve();
});

describe('CryptoAnalysis', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cryptoService.getCurrentPrice).mockResolvedValue(mockPrice);
    vi.mocked(indicatorService.getAvailableIndicators).mockResolvedValue(mockIndicators);
  });

  test('renders price and chart sections', async () => {
    render(<CryptoAnalysis />);
    
    expect(screen.getByText(/Current Price/i)).toBeInTheDocument();
    expect(screen.getByText(/Price History/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical Indicators/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(cryptoService.getCurrentPrice).toHaveBeenCalledWith('BTC');
    });
  });

  test('shows loading states initially', () => {
    render(<CryptoAnalysis />);
    
    expect(screen.getByTestId('price-chart-loading')).toBeInTheDocument();
  });

  // Connection status is tested in ConnectionStatus.test.tsx
  // Here we just test that CryptoAnalysis sets the correct status based on SignalR state
  test('sets correct connection status based on SignalR state', async () => {
    // Mock the ConnectionStatus component to verify props
    vi.mock('../components/ConnectionStatus', () => ({
      default: ({ status }: { status: string }) => (
        <div data-testid="connection-status" data-status={status}>
          {status}
        </div>
      )
    }));

    // Test connected state
    mockSignalRState = { isConnected: true, error: null };
    const { rerender } = render(<CryptoAnalysis />);
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected');
    });
    
    // Test error state
    mockSignalRState = { isConnected: false, error: new Error('Connection Error') };
    rerender(<CryptoAnalysis />);
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveAttribute('data-status', 'error');
    });
    
    // Test disconnected state
    mockSignalRState = { isConnected: false, error: null };
    rerender(<CryptoAnalysis />);
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveAttribute('data-status', 'disconnected');
    });
  });

  test('loads initial data on mount', async () => {
    render(<CryptoAnalysis />);
    
    await waitFor(() => {
      expect(cryptoService.getCurrentPrice).toHaveBeenCalled();
      expect(indicatorService.getAvailableIndicators).toHaveBeenCalled();
    });
  });

  test('updates symbol when input changes', async () => {
    const user = userEvent.setup();
    render(<CryptoAnalysis />);
    
    const input = screen.getByLabelText(/Symbol/i);
    await user.clear(input);
    await user.type(input, 'ETH');
    
    await waitFor(() => {
      expect(cryptoService.getCurrentPrice).toHaveBeenCalledWith('ETH');
    });
  });

  test('updates indicator type when select changes', async () => {
    const user = userEvent.setup();
    render(<CryptoAnalysis />);
    
    // Wait for indicators to load
    await waitFor(() => {
      expect(indicatorService.getAvailableIndicators).toHaveBeenCalled();
    });

    const select = screen.getByLabelText(/Indicator Type/i);
    await user.selectOptions(select, '1'); // ExponentialMovingAverage = 1
    
    expect(select).toHaveValue('1');
  });

  test('updates period when input changes', async () => {
    const user = userEvent.setup();
    render(<CryptoAnalysis />);
    
    const input = screen.getByLabelText(/Period/i);
    await user.clear(input);
    await user.type(input, '20');
    
    expect(input).toHaveValue(20);
  });

  // This test is now covered by the 'sets correct connection status based on SignalR state' test
});

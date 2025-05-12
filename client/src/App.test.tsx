import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent, act } from './test/utils';
import { cryptoService } from './services/cryptoService';
import { indicatorService } from './services/indicatorService';
import { IndicatorType } from './types/domain';
import App from './App';

// Mock the services
vi.mock('./services/cryptoService');
vi.mock('./services/indicatorService');
vi.mock('./hooks/useSignalR');

// Setup SignalR mock
const mockSignalR = {
  isConnected: true,
  error: null as Error | null,
  subscribeToPriceUpdates: vi.fn().mockResolvedValue(undefined),
  subscribeToIndicatorUpdates: vi.fn().mockResolvedValue(undefined)
};

// Configure SignalR mock
vi.mock('./hooks/useSignalR', () => ({
  useSignalR: () => mockSignalR
}));

// Setup mock data
const mockPrice = {
  symbol: 'BTC',
  price: 50000,
  timestamp: new Date().toISOString()
};

const mockIndicator = {
  symbol: 'BTC',
  type: IndicatorType.SimpleMovingAverage,
  value: 48000,
  startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  endTime: new Date().toISOString()
};

describe('App', () => {
  beforeEach(() => {
    vi.mocked(cryptoService.getCurrentPrice).mockResolvedValue(mockPrice);
    vi.mocked(indicatorService.getIndicator).mockResolvedValue(mockIndicator);
    vi.mocked(indicatorService.getAvailableIndicators).mockResolvedValue({ indicators: [IndicatorType.SimpleMovingAverage] });
    
    // Reset SignalR mock state
    Object.assign(mockSignalR, {
      isConnected: true,
      error: null,
      subscribeToPriceUpdates: vi.fn().mockResolvedValue(undefined),
      subscribeToIndicatorUpdates: vi.fn().mockResolvedValue(undefined)
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  it('renders without crashing', async () => {
    await renderWithProviders(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays the application title', async () => {
    await renderWithProviders(<App />);
    const header = screen.getByRole('heading', { level: 1 });
    expect(header).toHaveTextContent('AkashTrends');
  });

  it('displays the cryptocurrency price section', async () => {
    await renderWithProviders(<App />);
    expect(screen.getByText('Cryptocurrency Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
  });

  it('displays the technical indicator section', async () => {
    await renderWithProviders(<App />);
    expect(screen.getByText('Technical Indicator')).toBeInTheDocument();
    expect(screen.getByLabelText('Indicator Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Period (days)')).toBeInTheDocument();
  });

  it('displays the footer with copyright', async () => {
    await renderWithProviders(<App />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} AkashTrends`))).toBeInTheDocument();
  });

  it('shows real-time updates active when connected and has data', async () => {
    // Ensure connected state and mock successful data fetch
    mockSignalR.isConnected = true;
    mockSignalR.error = null;
    vi.mocked(cryptoService.getCurrentPrice).mockResolvedValueOnce(mockPrice);

    await renderWithProviders(<App />);

    // Wait for both price data and connection status
    await waitFor(() => {
      expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      expect(screen.getByText('Real-time updates active')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows and hides error message based on connection state', async () => {
    // Mock successful price fetch for initial data
    vi.mocked(cryptoService.getCurrentPrice).mockResolvedValueOnce(mockPrice);

    // Start with error state
    const initialSignalRState = {
      isConnected: false,
      error: new Error('Connection failed'),
      subscribeToPriceUpdates: vi.fn().mockResolvedValue(undefined),
      subscribeToIndicatorUpdates: vi.fn().mockResolvedValue(undefined)
    };
    Object.assign(mockSignalR, initialSignalRState);

    const { rerender } = await renderWithProviders(<App />);

    // First, verify error is shown and initial data loads
    await waitFor(() => {
      expect(screen.getByText(/Real-time updates unavailable/)).toBeInTheDocument();
      expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    });

    // Then simulate successful connection
    const connectedSignalRState = {
      isConnected: true,
      error: null,
      subscribeToPriceUpdates: vi.fn().mockResolvedValue(undefined),
      subscribeToIndicatorUpdates: vi.fn().mockResolvedValue(undefined)
    };

    await act(async () => {
      Object.assign(mockSignalR, connectedSignalRState);
      await rerender(<App />);
    });

    // Error should be hidden and success message shown
    await waitFor(() => {
      expect(screen.queryByText(/Real-time updates unavailable/)).not.toBeInTheDocument();
      expect(screen.getByText('Real-time updates active')).toBeInTheDocument();
    });
  });

  it('updates price display when symbol changes', async () => {
    // Setup initial render with BTC price
    vi.mocked(cryptoService.getCurrentPrice).mockResolvedValueOnce(mockPrice);
    await renderWithProviders(<App />);

    // Wait for initial price
    await waitFor(() => {
      expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    });

    // Setup mock for ETH price before changing symbol
    const ethPrice = {
      symbol: 'ETH',
      price: 3000,
      timestamp: new Date().toISOString()
    };
    vi.mocked(cryptoService.getCurrentPrice).mockResolvedValueOnce(ethPrice);

    // Change symbol
    await act(async () => {
      const input = screen.getByLabelText('Symbol') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'ETH' } });
    });

    // Wait for price update with increased timeout
    await waitFor(() => {
      const priceElement = screen.getByText((content) => {
        return content.includes('3,000.00');
      });
      expect(priceElement).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles empty symbol input gracefully', async () => {
    await renderWithProviders(<App />);

    // Clear symbol
    await act(async () => {
      const input = screen.getByLabelText('Symbol') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
    });

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText(/enter.*symbol/i)).toBeInTheDocument();
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument(); // Price should be cleared
    }, { timeout: 1000 });
  });
});

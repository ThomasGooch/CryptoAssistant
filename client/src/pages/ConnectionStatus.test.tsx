import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CryptoAnalysis } from './CryptoAnalysis';

// Create a very simple SignalR mock
const mockSignalR = {
  isConnected: true,
  error: null as Error | null,
  subscribeToPriceUpdates: vi.fn(),
  subscribeToIndicatorUpdates: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn()
};

// Mock the useSignalR hook
vi.mock('../hooks/useSignalR', () => ({
  useSignalR: vi.fn(() => mockSignalR)
}));

// Mock the services
vi.mock('../services/cryptoService', () => ({
  cryptoService: {
    getCurrentPrice: vi.fn().mockResolvedValue({ price: 50000, timestamp: new Date() })
  }
}));

vi.mock('../services/indicatorService', () => ({
  indicatorService: {
    getAvailableIndicators: vi.fn().mockResolvedValue({ indicators: [0, 1, 2] }),
    getIndicatorValue: vi.fn().mockResolvedValue(42),
    getIndicatorDisplayName: vi.fn().mockReturnValue('Simple Moving Average')
  }
}));

describe('Connection Status Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows connected state', async () => {
    // Set up the mock for connected state
    mockSignalR.isConnected = true;
    mockSignalR.error = null;
    
    // Render the component
    const { rerender } = render(<CryptoAnalysis />);
    
    // Force a re-render to ensure state is applied
    await act(async () => {
      rerender(<CryptoAnalysis />);
    });
    
    // Check the connection status
    await waitFor(() => {
      const statusElement = screen.getByTestId('connection-status');
      expect(statusElement).toHaveTextContent(/Connected/i);
      expect(statusElement).toHaveClass('bg-green-500');
    });
  });
  
  test('shows disconnected state', async () => {
    // Set up the mock for disconnected state
    mockSignalR.isConnected = false;
    mockSignalR.error = null;
    
    // Render the component
    const { rerender } = render(<CryptoAnalysis />);
    
    // Force a re-render to ensure state is applied
    await act(async () => {
      rerender(<CryptoAnalysis />);
    });
    
    // Check the connection status
    await waitFor(() => {
      const statusElement = screen.getByTestId('connection-status');
      expect(statusElement).toHaveTextContent(/Disconnected/i);
      expect(statusElement).toHaveClass('bg-yellow-500');
    });
  });
  
  test('shows error state', async () => {
    // Set up the mock for error state
    mockSignalR.isConnected = false;
    mockSignalR.error = new Error('Connection Error');
    
    // Render the component
    const { rerender } = render(<CryptoAnalysis />);
    
    // Force a re-render to ensure state is applied
    await act(async () => {
      rerender(<CryptoAnalysis />);
    });
    
    // Check the connection status
    await waitFor(() => {
      const statusElement = screen.getByTestId('connection-status');
      expect(statusElement).toHaveTextContent(/Connection Error/i);
      expect(statusElement).toHaveClass('bg-red-500');
    });
  });
});

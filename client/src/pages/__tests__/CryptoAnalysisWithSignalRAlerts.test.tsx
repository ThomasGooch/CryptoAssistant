import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { CryptoAnalysis } from "../CryptoAnalysis";
import { cryptoService } from "../../services/cryptoService";
import { indicatorService } from "../../services/indicatorService";

// Setup mock data
const mockPrice = {
  symbol: "BTC",
  price: 45000,
  timestamp: new Date().toISOString(),
};

const mockIndicators = { indicators: [0, 1, 2, 3, 4] };

// Mock the services
vi.mock("../../services/cryptoService");
vi.mock("../../services/indicatorService", () => ({
  indicatorService: {
    getAvailableIndicators: vi.fn(),
    getIndicatorValue: vi.fn(),
    getIndicatorDisplayName: vi.fn().mockReturnValue("Simple Moving Average"),
  },
}));

// Mock Chart.js to prevent canvas errors
vi.mock("chart.js", () => ({
  Chart: vi.fn(),
  registerables: [],
}));

// Mock AlertManagerServiceV2
vi.mock("../../services/alertManagerServiceV2", () => {
  const mockService = {
    getAlerts: vi.fn(),
    getActiveAlerts: vi.fn(),
    addAlert: vi.fn(),
    updateAlert: vi.fn(),
    removeAlert: vi.fn(),
    setUserId: vi.fn(),
    getUserId: vi.fn().mockReturnValue("default-user"),
  };
  return {
    alertManagerServiceV2: mockService,
  };
});

// Mock useSignalRAlerts hook
vi.mock("../../hooks/useSignalRAlerts", () => ({
  useSignalRAlerts: vi.fn().mockReturnValue({
    isConnected: true,
    error: null,
    notifications: [],
    clearNotifications: vi.fn(),
  }),
}));

// Create a configurable SignalR mock
let mockSignalRState = {
  isConnected: true,
  error: null as Error | null,
};

// Mock the useSignalR hook
vi.mock("../../hooks/useSignalR", () => ({
  useSignalR: vi.fn(() => ({
    isConnected: mockSignalRState.isConnected,
    error: mockSignalRState.error,
    subscribeToPriceUpdates: vi.fn(),
    subscribeToIndicatorUpdates: vi.fn(),
  })),
}));

// Mock ConnectionStatus component
vi.mock("../../components/ConnectionStatus", () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="connection-status" data-status={status}>
      {status}
    </div>
  ),
}));

import { alertManagerServiceV2 } from "../../services/alertManagerServiceV2";
import { useSignalRAlerts } from "../../hooks/useSignalRAlerts";

const mockAlertService = vi.mocked(alertManagerServiceV2);
const mockUseSignalRAlerts = vi.mocked(useSignalRAlerts);

beforeEach(async () => {
  vi.clearAllMocks();

  // Reset the SignalR mock state to connected by default
  mockSignalRState = {
    isConnected: true,
    error: null,
  };

  vi.mocked(cryptoService.getCurrentPrice).mockResolvedValue(mockPrice);
  vi.mocked(indicatorService.getAvailableIndicators).mockResolvedValue(
    mockIndicators,
  );

  // Setup default alert service mocks
  mockAlertService.getAlerts.mockResolvedValue([]);
  mockAlertService.getUserId.mockReturnValue("default-user");

  // Setup default SignalR alerts hook mock
  mockUseSignalRAlerts.mockReturnValue({
    isConnected: true,
    error: null,
    notifications: [],
    clearNotifications: vi.fn(),
  });

  await Promise.resolve();
});

describe("CryptoAnalysis with SignalR Alert Integration", () => {
  test("renders all sections including SignalR Alert Management", async () => {
    render(<CryptoAnalysis />);

    // Verify all main sections are present
    expect(screen.getByText(/Current Price/i)).toBeInTheDocument();
    expect(screen.getByText(/Price History/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical Indicators/i)).toBeInTheDocument();
    // AlertManagerWithSignalR has its own titles
    expect(screen.getByText(/Real-time Alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/Create New Alert/i)).toBeInTheDocument();

    // Wait for component to load
    await waitFor(() => {
      expect(cryptoService.getCurrentPrice).toHaveBeenCalledWith("BTC");
      expect(mockAlertService.getAlerts).toHaveBeenCalled();
    });
  });

  test("displays SignalR alert connection status", async () => {
    mockUseSignalRAlerts.mockReturnValue({
      isConnected: true,
      error: null,
      notifications: [],
      clearNotifications: vi.fn(),
    });

    render(<CryptoAnalysis />);

    await waitFor(() => {
      // Should show the SignalR connection status for alerts
      expect(screen.getByText(/Real-time Alerts/i)).toBeInTheDocument();
      // Look for the specific Connected text in the Real-time Alerts section
      const allConnectedTexts = screen.getAllByText(/Connected/i);
      expect(allConnectedTexts.length).toBeGreaterThan(0); // At least one Connected status
    });
  });

  test("shows SignalR alert connection error", async () => {
    mockUseSignalRAlerts.mockReturnValue({
      isConnected: false,
      error: new Error("SignalR Alert Connection Failed"),
      notifications: [],
      clearNotifications: vi.fn(),
    });

    render(<CryptoAnalysis />);

    await waitFor(() => {
      expect(screen.getByText(/Real-time Alerts/i)).toBeInTheDocument();
      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
      expect(screen.getByText(/SignalR Alert Connection Failed/i)).toBeInTheDocument();
    });
  });

  test("displays real-time alert notifications", async () => {
    const mockNotifications = [
      {
        AlertId: "alert-123",
        UserId: "default-user",
        Symbol: "BTC",
        Title: "BTC Alert",
        Message: "Bitcoin above $50,000",
        Threshold: 50000,
        Condition: "Above",
        TriggerPrice: 50100,
        TriggerTime: "2023-01-01T12:00:00Z",
        Type: "alert_triggered" as const
      }
    ];

    mockUseSignalRAlerts.mockReturnValue({
      isConnected: true,
      error: null,
      notifications: mockNotifications,
      clearNotifications: vi.fn(),
    });

    render(<CryptoAnalysis />);

    await waitFor(() => {
      // Should show the notification in the alert section
      expect(screen.getByText(/Alert Notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/Bitcoin above \$50,000/i)).toBeInTheDocument();
      expect(screen.getByText(/BTC/i)).toBeInTheDocument();
    });
  });

  test("initializes SignalR alerts with current user", async () => {
    render(<CryptoAnalysis />);

    await waitFor(() => {
      // Should initialize SignalR alerts hook with the current user
      expect(mockUseSignalRAlerts).toHaveBeenCalledWith("default-user");
    });
  });

  test("handles multiple SignalR alert notifications", async () => {
    const mockNotifications = [
      {
        AlertId: "alert-123",
        UserId: "default-user",
        Symbol: "BTC",
        Title: "BTC Alert",
        Message: "Bitcoin above $50,000",
        Threshold: 50000,
        Condition: "Above",
        TriggerPrice: 50100,
        TriggerTime: "2023-01-01T12:00:00Z",
        Type: "alert_triggered" as const
      },
      {
        AlertId: "alert-456",
        UserId: "default-user",
        Symbol: "ETH",
        Title: "ETH Alert",
        Message: "Ethereum below $3,000",
        Threshold: 3000,
        Condition: "Below",
        TriggerPrice: 2900,
        TriggerTime: "2023-01-01T12:05:00Z",
        Type: "alert_triggered" as const
      }
    ];

    mockUseSignalRAlerts.mockReturnValue({
      isConnected: true,
      error: null,
      notifications: mockNotifications,
      clearNotifications: vi.fn(),
    });

    render(<CryptoAnalysis />);

    await waitFor(() => {
      expect(screen.getByText(/2 notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/Bitcoin above \$50,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Ethereum below \$3,000/i)).toBeInTheDocument();
    });
  });

  test("maintains existing functionality with SignalR integration", async () => {
    render(<CryptoAnalysis />);

    // Verify original functionality still works
    await waitFor(() => {
      expect(cryptoService.getCurrentPrice).toHaveBeenCalledWith("BTC");
      expect(indicatorService.getAvailableIndicators).toHaveBeenCalled();
    });

    // Verify SignalR price updates still work (separate from alert SignalR)
    expect(screen.getByTestId("connection-status")).toHaveAttribute(
      "data-status",
      "connected"
    );

    // Verify alert management is integrated
    expect(mockAlertService.getAlerts).toHaveBeenCalled();
    expect(mockUseSignalRAlerts).toHaveBeenCalledWith("default-user");
  });

  test("gracefully handles SignalR alert service unavailable", async () => {
    mockUseSignalRAlerts.mockReturnValue({
      isConnected: false,
      error: null, // No error, just not connected
      notifications: [],
      clearNotifications: vi.fn(),
    });

    render(<CryptoAnalysis />);

    await waitFor(() => {
      // Should show connecting state
      expect(screen.getByText(/Connecting/i)).toBeInTheDocument();
      // But still allow alert management
      expect(screen.getByText(/Create New Alert/i)).toBeInTheDocument();
    });
  });
});
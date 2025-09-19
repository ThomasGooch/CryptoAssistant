import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AlertManagerWithSignalR } from "../AlertManagerWithSignalR";
import { AlertCondition, AlertSeverity, AlertStatus } from "../../../types/domain";
import type { PriceAlert, SignalRAlertNotification } from "../../../types/domain";

// Mock the AlertManagerServiceV2
vi.mock("../../../services/alertManagerServiceV2", () => {
  const mockService = {
    getAlerts: vi.fn(),
    getActiveAlerts: vi.fn(), 
    addAlert: vi.fn(),
    updateAlert: vi.fn(),
    removeAlert: vi.fn(),
    setUserId: vi.fn(),
    getUserId: vi.fn(),
  };
  return {
    alertManagerServiceV2: mockService,
  };
});

// Mock the useSignalRAlerts hook
vi.mock("../../../hooks/useSignalRAlerts", () => ({
  useSignalRAlerts: vi.fn(),
}));

import { alertManagerServiceV2 } from "../../../services/alertManagerServiceV2";
import { useSignalRAlerts } from "../../../hooks/useSignalRAlerts";

const mockAlertService = vi.mocked(alertManagerServiceV2);
const mockUseSignalRAlerts = vi.mocked(useSignalRAlerts);

describe("AlertManagerWithSignalR", () => {
  const mockPriceAlert: PriceAlert = {
    id: "alert-1",
    symbol: "BTC",
    condition: AlertCondition.PriceAbove,
    targetValue: 50000,
    message: "Test alert",
    severity: AlertSeverity.Info,
    status: AlertStatus.Active,
    createdAt: "2023-01-01T00:00:00Z",
    cooldownSeconds: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockAlertService.getAlerts.mockResolvedValue([]);
    mockAlertService.addAlert.mockResolvedValue(mockPriceAlert);
    mockAlertService.updateAlert.mockResolvedValue(mockPriceAlert);
    mockAlertService.removeAlert.mockResolvedValue();

    // Default SignalR hook mock
    mockUseSignalRAlerts.mockReturnValue({
      isConnected: true,
      error: null,
      notifications: [],
      clearNotifications: vi.fn(),
    });
  });

  describe("SignalR integration", () => {
    it("should initialize SignalR connection with current user", () => {
      mockAlertService.getUserId.mockReturnValue("user123");
      
      render(<AlertManagerWithSignalR />);
      
      expect(mockUseSignalRAlerts).toHaveBeenCalledWith("user123");
    });

    it("should display SignalR connection status", () => {
      mockUseSignalRAlerts.mockReturnValue({
        isConnected: true,
        error: null,
        notifications: [],
        clearNotifications: vi.fn(),
      });

      render(<AlertManagerWithSignalR />);
      
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it("should display SignalR connection error", () => {
      mockUseSignalRAlerts.mockReturnValue({
        isConnected: false,
        error: new Error("Connection failed"),
        notifications: [],
        clearNotifications: vi.fn(),
      });

      render(<AlertManagerWithSignalR />);
      
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
    });

    it("should show loading state while disconnected", () => {
      mockUseSignalRAlerts.mockReturnValue({
        isConnected: false,
        error: null,
        notifications: [],
        clearNotifications: vi.fn(),
      });

      render(<AlertManagerWithSignalR />);
      
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });
  });

  describe("real-time notifications", () => {
    it("should display real-time alert notifications", () => {
      const mockNotifications: SignalRAlertNotification[] = [
        {
          AlertId: "alert-123",
          UserId: "user123",
          Symbol: "BTC",
          Title: "BTC Alert",
          Message: "Bitcoin above $50,000",
          Threshold: 50000,
          Condition: "Above",
          TriggerPrice: 50100,
          TriggerTime: "2023-01-01T12:00:00Z",
          Type: "alert_triggered"
        }
      ];

      mockUseSignalRAlerts.mockReturnValue({
        isConnected: true,
        error: null,
        notifications: mockNotifications,
        clearNotifications: vi.fn(),
      });

      render(<AlertManagerWithSignalR />);
      
      expect(screen.getByText(/bitcoin above \$50,000/i)).toBeInTheDocument();
      expect(screen.getByText(/btc/i)).toBeInTheDocument();
      expect(screen.getByText(/\$50,100/i)).toBeInTheDocument();
    });

    it("should display multiple notifications", () => {
      const mockNotifications: SignalRAlertNotification[] = [
        {
          AlertId: "alert-123",
          UserId: "user123",
          Symbol: "BTC",
          Title: "BTC Alert",
          Message: "Bitcoin above $50,000",
          Threshold: 50000,
          Condition: "Above",
          TriggerPrice: 50100,
          TriggerTime: "2023-01-01T12:00:00Z",
          Type: "alert_triggered"
        },
        {
          AlertId: "alert-456",
          UserId: "user123",
          Symbol: "ETH",
          Title: "ETH Alert",
          Message: "Ethereum below $3,000",
          Threshold: 3000,
          Condition: "Below",
          TriggerPrice: 2900,
          TriggerTime: "2023-01-01T12:05:00Z",
          Type: "alert_triggered"
        }
      ];

      mockUseSignalRAlerts.mockReturnValue({
        isConnected: true,
        error: null,
        notifications: mockNotifications,
        clearNotifications: vi.fn(),
      });

      render(<AlertManagerWithSignalR />);
      
      expect(screen.getByText(/bitcoin above \$50,000/i)).toBeInTheDocument();
      expect(screen.getByText(/ethereum below \$3,000/i)).toBeInTheDocument();
    });

    it("should allow clearing notifications", () => {
      const mockClearNotifications = vi.fn();
      const mockNotifications: SignalRAlertNotification[] = [
        {
          AlertId: "alert-123",
          UserId: "user123",
          Symbol: "BTC",
          Title: "BTC Alert",
          Message: "Bitcoin above $50,000",
          Threshold: 50000,
          Condition: "Above",
          TriggerPrice: 50100,
          TriggerTime: "2023-01-01T12:00:00Z",
          Type: "alert_triggered"
        }
      ];

      mockUseSignalRAlerts.mockReturnValue({
        isConnected: true,
        error: null,
        notifications: mockNotifications,
        clearNotifications: mockClearNotifications,
      });

      render(<AlertManagerWithSignalR />);
      
      const clearButton = screen.getByRole("button", { name: /clear notifications/i });
      fireEvent.click(clearButton);
      
      expect(mockClearNotifications).toHaveBeenCalled();
    });

    it("should show notification count", () => {
      const mockNotifications: SignalRAlertNotification[] = [
        {
          AlertId: "alert-123",
          UserId: "user123", 
          Symbol: "BTC",
          Title: "BTC Alert",
          Message: "Bitcoin above $50,000",
          Threshold: 50000,
          Condition: "Above",
          TriggerPrice: 50100,
          TriggerTime: "2023-01-01T12:00:00Z",
          Type: "alert_triggered"
        },
        {
          AlertId: "alert-456",
          UserId: "user123",
          Symbol: "ETH", 
          Title: "ETH Alert",
          Message: "Ethereum below $3,000",
          Threshold: 3000,
          Condition: "Below",
          TriggerPrice: 2900,
          TriggerTime: "2023-01-01T12:05:00Z",
          Type: "alert_triggered"
        }
      ];

      mockUseSignalRAlerts.mockReturnValue({
        isConnected: true,
        error: null,
        notifications: mockNotifications,
        clearNotifications: vi.fn(),
      });

      render(<AlertManagerWithSignalR />);
      
      expect(screen.getByText(/2 notifications/i)).toBeInTheDocument();
    });

    it("should hide notifications section when no notifications", () => {
      mockUseSignalRAlerts.mockReturnValue({
        isConnected: true,
        error: null,
        notifications: [],
        clearNotifications: vi.fn(),
      });

      render(<AlertManagerWithSignalR />);
      
      expect(screen.queryByText(/notifications/i)).not.toBeInTheDocument();
    });
  });

  describe("enhanced alert management", () => {
    it("should reload alerts when receiving real-time notifications", async () => {
      const mockNotifications: SignalRAlertNotification[] = [
        {
          AlertId: "alert-123",
          UserId: "user123",
          Symbol: "BTC",
          Title: "BTC Alert",
          Message: "Bitcoin above $50,000",
          Threshold: 50000,
          Condition: "Above",
          TriggerPrice: 50100,
          TriggerTime: "2023-01-01T12:00:00Z",
          Type: "alert_triggered"
        }
      ];

      // Start with no notifications
      const { rerender } = render(<AlertManagerWithSignalR />);
      
      expect(mockAlertService.getAlerts).toHaveBeenCalledTimes(1);

      // Update to have notifications
      mockUseSignalRAlerts.mockReturnValue({
        isConnected: true,
        error: null,
        notifications: mockNotifications,
        clearNotifications: vi.fn(),
      });

      rerender(<AlertManagerWithSignalR />);

      // Should reload alerts when notifications change
      await waitFor(() => {
        expect(mockAlertService.getAlerts).toHaveBeenCalledTimes(2);
      });
    });
  });
});
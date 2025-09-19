import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSignalRAlerts } from "../useSignalRAlerts";
import type { SignalRAlertNotification } from "../../types/domain";

// Mock the signalRAlertService
vi.mock("../../services/signalRAlertService", () => ({
  signalRAlertService: {
    startConnection: vi.fn(),
    stopConnection: vi.fn(),
    subscribeToAlerts: vi.fn(),
    unsubscribeFromAlerts: vi.fn(),
    onAlertNotification: vi.fn(),
    offAlertNotification: vi.fn(),
    isConnected: true,
  },
}));

import { signalRAlertService } from "../../services/signalRAlertService";

const mockSignalRAlertService = vi.mocked(signalRAlertService);

describe("useSignalRAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignalRAlertService.startConnection.mockResolvedValue();
    mockSignalRAlertService.stopConnection.mockResolvedValue();
    mockSignalRAlertService.subscribeToAlerts.mockResolvedValue();
    mockSignalRAlertService.unsubscribeFromAlerts.mockResolvedValue();
    (mockSignalRAlertService as any).isConnected = true;
  });

  describe("connection management", () => {
    it("should start connection on mount", async () => {
      renderHook(() => useSignalRAlerts("user123"));

      expect(mockSignalRAlertService.startConnection).toHaveBeenCalled();
    });

    it("should stop connection on unmount", async () => {
      const { unmount } = renderHook(() => useSignalRAlerts("user123"));

      unmount();

      expect(mockSignalRAlertService.stopConnection).toHaveBeenCalled();
    });

    it("should subscribe to alerts for user on mount", async () => {
      await act(async () => {
        renderHook(() => useSignalRAlerts("user123"));
      });

      expect(mockSignalRAlertService.subscribeToAlerts).toHaveBeenCalledWith("user123");
    });

    it("should handle connection errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSignalRAlertService.startConnection.mockRejectedValue(new Error("Connection failed"));
      (mockSignalRAlertService as any).isConnected = false; // Mock disconnected state

      const { result } = renderHook(() => useSignalRAlerts("user123"));

      // Wait for async effects to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("user subscription", () => {
    it("should resubscribe when userId changes", async () => {
      const { rerender } = renderHook(
        ({ userId }) => useSignalRAlerts(userId),
        { initialProps: { userId: "user123" } }
      );

      // Wait for initial subscription
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Clear mocks to isolate the rerender behavior
      vi.clearAllMocks();

      await act(async () => {
        rerender({ userId: "user456" });
      });

      expect(mockSignalRAlertService.unsubscribeFromAlerts).toHaveBeenCalledWith("user123");
      expect(mockSignalRAlertService.subscribeToAlerts).toHaveBeenCalledWith("user456");
    });

    it("should not subscribe if userId is empty", async () => {
      renderHook(() => useSignalRAlerts(""));

      expect(mockSignalRAlertService.subscribeToAlerts).not.toHaveBeenCalled();
    });

    it("should unsubscribe from previous user when userId changes", async () => {
      const { rerender } = renderHook(
        ({ userId }) => useSignalRAlerts(userId),
        { initialProps: { userId: "user123" } }
      );

      // Wait for initial setup
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Clear the initial calls
      vi.clearAllMocks();

      await act(async () => {
        rerender({ userId: "user456" });
      });

      expect(mockSignalRAlertService.unsubscribeFromAlerts).toHaveBeenCalledWith("user123");
      expect(mockSignalRAlertService.subscribeToAlerts).toHaveBeenCalledWith("user456");
    });
  });

  describe("alert notification handling", () => {
    it("should register alert notification callback", () => {
      renderHook(() => useSignalRAlerts("user123"));

      expect(mockSignalRAlertService.onAlertNotification).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it("should update notifications state when receiving alert", async () => {
      let capturedCallback: ((notification: SignalRAlertNotification) => void) | null = null;

      mockSignalRAlertService.onAlertNotification.mockImplementation((callback) => {
        capturedCallback = callback;
      });

      const { result } = renderHook(() => useSignalRAlerts("user123"));

      const mockNotification: SignalRAlertNotification = {
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
      };

      act(() => {
        capturedCallback?.(mockNotification);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toEqual(mockNotification);
    });

    it("should accumulate multiple notifications", async () => {
      let capturedCallback: ((notification: SignalRAlertNotification) => void) | null = null;

      mockSignalRAlertService.onAlertNotification.mockImplementation((callback) => {
        capturedCallback = callback;
      });

      const { result } = renderHook(() => useSignalRAlerts("user123"));

      const notification1: SignalRAlertNotification = {
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
      };

      const notification2: SignalRAlertNotification = {
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
      };

      act(() => {
        capturedCallback?.(notification1);
        capturedCallback?.(notification2);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0]).toEqual(notification1);
      expect(result.current.notifications[1]).toEqual(notification2);
    });

    it("should provide clearNotifications function", async () => {
      let capturedCallback: ((notification: SignalRAlertNotification) => void) | null = null;

      mockSignalRAlertService.onAlertNotification.mockImplementation((callback) => {
        capturedCallback = callback;
      });

      const { result } = renderHook(() => useSignalRAlerts("user123"));

      const mockNotification: SignalRAlertNotification = {
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
      };

      act(() => {
        capturedCallback?.(mockNotification);
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it("should unregister callback on unmount", () => {
      let capturedCallback: ((notification: SignalRAlertNotification) => void) | null = null;

      mockSignalRAlertService.onAlertNotification.mockImplementation((callback) => {
        capturedCallback = callback;
      });

      const { unmount } = renderHook(() => useSignalRAlerts("user123"));

      unmount();

      expect(mockSignalRAlertService.offAlertNotification).toHaveBeenCalledWith(
        capturedCallback
      );
    });
  });

  describe("connection state", () => {
    it("should return connection status", () => {
      (mockSignalRAlertService as any).isConnected = true;
      const { result } = renderHook(() => useSignalRAlerts("user123"));

      expect(result.current.isConnected).toBe(true);
    });

    it("should return false when disconnected", () => {
      (mockSignalRAlertService as any).isConnected = false;
      const { result } = renderHook(() => useSignalRAlerts("user123"));

      expect(result.current.isConnected).toBe(false);
    });
  });
});
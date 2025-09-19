import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { alertService } from "../alertService";
import { AlertCondition, AlertSeverity } from "../../types/domain";
import type {
  AlertNotification,
  PriceAlert,
  IndicatorAlert,
} from "../../types/domain";

describe("alertService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    alertService.clearAllNotifications();
  });

  describe("evaluatePriceAlert", () => {
    const mockPriceAlert: PriceAlert = {
      id: "alert-1",
      symbol: "BTC",
      condition: AlertCondition.PriceAbove,
      targetValue: 50000,
      message: "Bitcoin reached target price",
      severity: AlertSeverity.Info,
      status: 0, // AlertStatus.Active
      createdAt: "2025-01-15T12:00:00.000Z",
    };

    it("should trigger alert when price is above target for PriceAbove condition", () => {
      const result = alertService.evaluatePriceAlert(mockPriceAlert, 51000);
      expect(result).toBe(true);
    });

    it("should not trigger alert when price is below target for PriceAbove condition", () => {
      const result = alertService.evaluatePriceAlert(mockPriceAlert, 49000);
      expect(result).toBe(false);
    });

    it("should trigger alert when price is below target for PriceBelow condition", () => {
      const belowAlert = {
        ...mockPriceAlert,
        condition: AlertCondition.PriceBelow,
        targetValue: 45000,
      };
      const result = alertService.evaluatePriceAlert(belowAlert, 44000);
      expect(result).toBe(true);
    });

    it("should not trigger alert when price is above target for PriceBelow condition", () => {
      const belowAlert = {
        ...mockPriceAlert,
        condition: AlertCondition.PriceBelow,
        targetValue: 45000,
      };
      const result = alertService.evaluatePriceAlert(belowAlert, 46000);
      expect(result).toBe(false);
    });
  });

  describe("createNotification", () => {
    const mockPriceAlert: PriceAlert = {
      id: "alert-1",
      symbol: "BTC",
      condition: AlertCondition.PriceAbove,
      targetValue: 50000,
      message: "Bitcoin reached target price",
      severity: AlertSeverity.Info,
      status: 0,
      createdAt: "2025-01-15T12:00:00.000Z",
    };

    it("should create notification with correct properties", () => {
      const currentPrice = 51000;
      const notification = alertService.createNotification(
        mockPriceAlert,
        currentPrice,
      );

      expect(notification.id).toBeDefined();
      expect(notification.alertId).toBe("alert-1");
      expect(notification.symbol).toBe("BTC");
      expect(notification.message).toBe("Bitcoin reached target price");
      expect(notification.severity).toBe(AlertSeverity.Info);
      expect(notification.currentValue).toBe(51000);
      expect(notification.targetValue).toBe(50000);
      expect(notification.condition).toBe(AlertCondition.PriceAbove);
      expect(notification.isRead).toBe(false);
      expect(notification.triggeredAt).toBeDefined();
    });

    it("should generate unique IDs for different notifications", () => {
      const notification1 = alertService.createNotification(
        mockPriceAlert,
        51000,
      );
      const notification2 = alertService.createNotification(
        mockPriceAlert,
        52000,
      );

      expect(notification1.id).not.toBe(notification2.id);
    });
  });

  describe("evaluateIndicatorAlert (RSI)", () => {
    const mockRSIAlert: IndicatorAlert = {
      id: "rsi-1",
      symbol: "BTC",
      indicatorType: 2, // RelativeStrengthIndex
      period: 14,
      condition: AlertCondition.RSIAbove,
      targetValue: 70,
      message: "RSI overbought",
      severity: AlertSeverity.Warning,
      status: 0,
      createdAt: "2025-01-15T12:00:00.000Z",
    };

    it("should trigger when RSI is above target for RSIAbove", () => {
      const result = alertService.evaluateIndicatorAlert(mockRSIAlert, 72);
      expect(result).toBe(true);
    });

    it("should not trigger when RSI is below target for RSIAbove", () => {
      const result = alertService.evaluateIndicatorAlert(mockRSIAlert, 65);
      expect(result).toBe(false);
    });

    it("should trigger when RSI is below target for RSIBelow", () => {
      const below = {
        ...mockRSIAlert,
        condition: AlertCondition.RSIBelow,
        targetValue: 30,
      };
      const result = alertService.evaluateIndicatorAlert(below, 25);
      expect(result).toBe(true);
    });

    it("should not trigger when RSI is above target for RSIBelow", () => {
      const below = {
        ...mockRSIAlert,
        condition: AlertCondition.RSIBelow,
        targetValue: 30,
      };
      const result = alertService.evaluateIndicatorAlert(below, 35);
      expect(result).toBe(false);
    });
  });

  describe("notification management", () => {
    let mockNotifications: AlertNotification[];

    beforeEach(() => {
      mockNotifications = [
        {
          id: "notif-1",
          alertId: "alert-1",
          symbol: "BTC",
          message: "Bitcoin alert 1",
          severity: AlertSeverity.Info,
          triggeredAt: "2025-01-15T12:00:00.000Z",
          currentValue: 51000,
          targetValue: 50000,
          condition: AlertCondition.PriceAbove,
          isRead: false,
        },
        {
          id: "notif-2",
          alertId: "alert-2",
          symbol: "ETH",
          message: "Ethereum alert 2",
          severity: AlertSeverity.Warning,
          triggeredAt: "2025-01-15T12:01:00.000Z",
          currentValue: 3000,
          targetValue: 3200,
          condition: AlertCondition.PriceBelow,
          isRead: false,
        },
      ];

      mockNotifications.forEach((notification) => {
        alertService.addNotification(notification);
      });
    });

    it("should add notifications correctly", () => {
      const notifications = alertService.getNotifications();
      expect(notifications).toHaveLength(2);
      expect(notifications[0].id).toBe("notif-1");
      expect(notifications[1].id).toBe("notif-2");
    });

    it("should mark notification as read", () => {
      alertService.markAsRead("notif-1");
      const notifications: AlertNotification[] =
        alertService.getNotifications();
      const notification1 = notifications.find(
        (n: AlertNotification) => n.id === "notif-1",
      );
      const notification2 = notifications.find(
        (n: AlertNotification) => n.id === "notif-2",
      );

      expect(notification1?.isRead).toBe(true);
      expect(notification2?.isRead).toBe(false);
    });

    it("should dismiss notification", () => {
      alertService.dismissNotification("notif-1");
      const notifications = alertService.getNotifications();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe("notif-2");
    });

    it("should clear all notifications", () => {
      alertService.clearAllNotifications();
      const notifications = alertService.getNotifications();

      expect(notifications).toHaveLength(0);
    });

    it("should get unread notifications only", () => {
      alertService.markAsRead("notif-1");
      const unreadNotifications = alertService.getUnreadNotifications();

      expect(unreadNotifications).toHaveLength(1);
      expect(unreadNotifications[0].id).toBe("notif-2");
    });
  });

  describe("notification subscription", () => {
    it("should notify subscribers when notification is added", () => {
      const mockCallback = vi.fn();
      alertService.subscribe(mockCallback);

      const notification: AlertNotification = {
        id: "notif-1",
        alertId: "alert-1",
        symbol: "BTC",
        message: "Test notification",
        severity: AlertSeverity.Info,
        triggeredAt: "2025-01-15T12:00:00.000Z",
        currentValue: 51000,
        targetValue: 50000,
        condition: AlertCondition.PriceAbove,
        isRead: false,
      };

      alertService.addNotification(notification);

      expect(mockCallback).toHaveBeenCalledWith([notification]);
    });

    it("should notify subscribers when notification is dismissed", () => {
      const mockCallback = vi.fn();

      const notification: AlertNotification = {
        id: "notif-1",
        alertId: "alert-1",
        symbol: "BTC",
        message: "Test notification",
        severity: AlertSeverity.Info,
        triggeredAt: "2025-01-15T12:00:00.000Z",
        currentValue: 51000,
        targetValue: 50000,
        condition: AlertCondition.PriceAbove,
        isRead: false,
      };

      alertService.addNotification(notification);
      alertService.subscribe(mockCallback);

      alertService.dismissNotification("notif-1");

      expect(mockCallback).toHaveBeenCalledWith([]);
    });

    it("should unsubscribe callback correctly", () => {
      const mockCallback = vi.fn();
      alertService.subscribe(mockCallback);
      alertService.unsubscribe(mockCallback);

      const notification: AlertNotification = {
        id: "notif-1",
        alertId: "alert-1",
        symbol: "BTC",
        message: "Test notification",
        severity: AlertSeverity.Info,
        triggeredAt: "2025-01-15T12:00:00.000Z",
        currentValue: 51000,
        targetValue: 50000,
        condition: AlertCondition.PriceAbove,
        isRead: false,
      };

      alertService.addNotification(notification);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("per-alert cooldown functionality", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("evaluatePriceAlert with custom cooldown", () => {
      it("should use default cooldown when cooldownSeconds is not specified", () => {
        const alert: PriceAlert = {
          id: "alert-1",
          symbol: "BTC",
          condition: AlertCondition.PriceAbove,
          targetValue: 50000,
          message: "Bitcoin reached target price",
          severity: AlertSeverity.Info,
          status: 0,
          createdAt: "2025-01-15T12:00:00.000Z",
        };

        // First trigger should succeed
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(true);

        // Second trigger within default cooldown (30s) should fail
        vi.advanceTimersByTime(29 * 1000);
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(false);

        // Third trigger after default cooldown should succeed
        vi.advanceTimersByTime(2 * 1000);
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(true);
      });

      it("should use custom cooldown when cooldownSeconds is specified", () => {
        const alert: PriceAlert = {
          id: "alert-2",
          symbol: "BTC",
          condition: AlertCondition.PriceAbove,
          targetValue: 50000,
          message: "Bitcoin reached target price",
          severity: AlertSeverity.Info,
          status: 0,
          createdAt: "2025-01-15T12:00:00.000Z",
          cooldownSeconds: 10,
        };

        // First trigger should succeed
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(true);

        // Second trigger within custom cooldown (10s) should fail
        vi.advanceTimersByTime(9 * 1000);
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(false);

        // Third trigger after custom cooldown should succeed
        vi.advanceTimersByTime(2 * 1000);
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(true);
      });

      it("should handle zero cooldown as immediate re-trigger allowed", () => {
        const alert: PriceAlert = {
          id: "alert-3",
          symbol: "BTC",
          condition: AlertCondition.PriceAbove,
          targetValue: 50000,
          message: "Bitcoin reached target price",
          severity: AlertSeverity.Info,
          status: 0,
          createdAt: "2025-01-15T12:00:00.000Z",
          cooldownSeconds: 0,
        };

        // All triggers should succeed with 0 cooldown
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(true);
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(true);
        expect(alertService.evaluatePriceAlert(alert, 51000)).toBe(true);
      });
    });

    describe("evaluateIndicatorAlert with custom cooldown", () => {
      it("should use default cooldown when cooldownSeconds is not specified", () => {
        const alert: IndicatorAlert = {
          id: "rsi-1",
          symbol: "BTC",
          indicatorType: 2,
          period: 14,
          condition: AlertCondition.RSIAbove,
          targetValue: 70,
          message: "RSI overbought",
          severity: AlertSeverity.Warning,
          status: 0,
          createdAt: "2025-01-15T12:00:00.000Z",
        };

        // First trigger should succeed
        expect(alertService.evaluateIndicatorAlert(alert, 72)).toBe(true);

        // Second trigger within default cooldown should fail
        vi.advanceTimersByTime(29 * 1000);
        expect(alertService.evaluateIndicatorAlert(alert, 72)).toBe(false);

        // Third trigger after default cooldown should succeed
        vi.advanceTimersByTime(2 * 1000);
        expect(alertService.evaluateIndicatorAlert(alert, 72)).toBe(true);
      });

      it("should use custom cooldown when cooldownSeconds is specified", () => {
        const alert: IndicatorAlert = {
          id: "rsi-2",
          symbol: "BTC",
          indicatorType: 2,
          period: 14,
          condition: AlertCondition.RSIAbove,
          targetValue: 70,
          message: "RSI overbought",
          severity: AlertSeverity.Warning,
          status: 0,
          createdAt: "2025-01-15T12:00:00.000Z",
          cooldownSeconds: 60,
        };

        // First trigger should succeed
        expect(alertService.evaluateIndicatorAlert(alert, 72)).toBe(true);

        // Second trigger within custom cooldown (60s) should fail
        vi.advanceTimersByTime(59 * 1000);
        expect(alertService.evaluateIndicatorAlert(alert, 72)).toBe(false);

        // Third trigger after custom cooldown should succeed
        vi.advanceTimersByTime(2 * 1000);
        expect(alertService.evaluateIndicatorAlert(alert, 72)).toBe(true);
      });
    });

    describe("per-alert cooldown isolation", () => {
      it("should maintain separate cooldown timers for different alerts", () => {
        const alert1: PriceAlert = {
          id: "alert-1",
          symbol: "BTC",
          condition: AlertCondition.PriceAbove,
          targetValue: 50000,
          message: "Bitcoin alert 1",
          severity: AlertSeverity.Info,
          status: 0,
          createdAt: "2025-01-15T12:00:00.000Z",
          cooldownSeconds: 5,
        };

        const alert2: PriceAlert = {
          id: "alert-2",
          symbol: "ETH",
          condition: AlertCondition.PriceAbove,
          targetValue: 3000,
          message: "Ethereum alert 2",
          severity: AlertSeverity.Info,
          status: 0,
          createdAt: "2025-01-15T12:00:00.000Z",
          cooldownSeconds: 15,
        };

        // Both alerts should trigger initially
        expect(alertService.evaluatePriceAlert(alert1, 51000)).toBe(true);
        expect(alertService.evaluatePriceAlert(alert2, 3100)).toBe(true);

        // After 6 seconds, alert1 should re-trigger but alert2 should not
        vi.advanceTimersByTime(6 * 1000);
        expect(alertService.evaluatePriceAlert(alert1, 51000)).toBe(true);
        expect(alertService.evaluatePriceAlert(alert2, 3100)).toBe(false);

        // After 16 seconds total, both should re-trigger
        vi.advanceTimersByTime(10 * 1000);
        expect(alertService.evaluatePriceAlert(alert1, 51000)).toBe(true);
        expect(alertService.evaluatePriceAlert(alert2, 3100)).toBe(true);
      });
    });
  });
});

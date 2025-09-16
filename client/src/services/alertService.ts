import type { PriceAlert, AlertNotification, IndicatorAlert } from "../types/domain";
import { AlertCondition, AlertSeverity } from "../types/domain";

type Subscriber = (notifications: AlertNotification[]) => void;

const notifications: AlertNotification[] = [];
const subscribers = new Set<Subscriber>();

// Map alertId -> last triggered timestamp (ms) to implement cooldown/hysteresis
const alertLastTriggered: Map<string, number> = new Map();

// Default cooldown (milliseconds) to prevent repeat notifications on rapid ticks
const DEFAULT_COOLDOWN_MS = 30 * 1000; // 30 seconds

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const alertService = {
  // Evaluate price-based alerts (PriceAbove / PriceBelow)
  evaluatePriceAlert(alert: PriceAlert, currentPrice: number): boolean {
    const triggered = (() => {
      switch (alert.condition) {
        case AlertCondition.PriceAbove:
          return currentPrice >= alert.targetValue;
        case AlertCondition.PriceBelow:
          return currentPrice <= alert.targetValue;
        default:
          return false;
      }
    })();

    if (!triggered) return false;

    // Hysteresis / de-duplication: don't retrigger if within cooldown
    const last = alertLastTriggered.get(alert.id) || 0;
    const now = Date.now();
    if (now - last < DEFAULT_COOLDOWN_MS) return false;

    // mark as triggered now
    alertLastTriggered.set(alert.id, now);
    return true;
  },

  // Evaluate indicator-based alerts (e.g., RSIAbove / RSIBelow)
  evaluateIndicatorAlert(alert: IndicatorAlert, indicatorValue: number): boolean {
    const triggered = (() => {
      switch (alert.condition) {
        case AlertCondition.RSIAbove:
          return indicatorValue >= alert.targetValue;
        case AlertCondition.RSIBelow:
          return indicatorValue <= alert.targetValue;
        default:
          return false;
      }
    })();

    if (!triggered) return false;

    // Hysteresis / de-duplication: don't retrigger if within cooldown
    const last = alertLastTriggered.get(alert.id) || 0;
    const now = Date.now();
    if (now - last < DEFAULT_COOLDOWN_MS) return false;

    // mark as triggered now
    alertLastTriggered.set(alert.id, now);
    return true;
  },

  createNotification(alert: PriceAlert, currentPrice: number): AlertNotification {
    const notification: AlertNotification = {
      id: generateId(),
      alertId: alert.id,
      symbol: alert.symbol,
      message: alert.message,
      severity: alert.severity as AlertSeverity,
      triggeredAt: new Date().toISOString(),
      currentValue: currentPrice,
      targetValue: alert.targetValue,
      condition: alert.condition as AlertCondition,
      isRead: false,
    };

    return notification;
  },

  addNotification(notification: AlertNotification) {
    notifications.push(notification);
    this.notifySubscribers();
  },

  getNotifications(): AlertNotification[] {
    return [...notifications];
  },

  markAsRead(notificationId: string) {
    const n = notifications.find((x) => x.id === notificationId);
    if (n) {
      n.isRead = true;
      this.notifySubscribers();
    }
  },

  dismissNotification(notificationId: string) {
    const idx = notifications.findIndex((x) => x.id === notificationId);
    if (idx >= 0) {
      notifications.splice(idx, 1);
      this.notifySubscribers();
    }
  },

  clearAllNotifications() {
    notifications.splice(0, notifications.length);
    // Reset hysteresis state so tests and reloads can re-trigger alerts
    alertLastTriggered.clear();
    this.notifySubscribers();
  },

  getUnreadNotifications(): AlertNotification[] {
    return notifications.filter((n) => !n.isRead);
  },

  subscribe(cb: Subscriber) {
    subscribers.add(cb);
  },

  unsubscribe(cb: Subscriber) {
    subscribers.delete(cb);
  },

  notifySubscribers() {
    const snapshot = [...notifications];
    subscribers.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        // swallow subscriber errors to avoid breaking service
        // callers (tests) won't rely on exceptions here
        console.warn('Subscriber callback error:', err);
      }
    });
  },
};

export default alertService;

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { alertService } from "../../services/alertService";
import { alertManager } from "../../services/alertManagerService";
import { AlertCondition } from "../../types/domain";
import type { IndicatorAlert, PriceAlert } from "../../types/domain";

describe("smoke: alert cooldown", () => {
  beforeEach(() => {
    alertManager.clearAll();
    alertService.clearAllNotifications();
    vi.useFakeTimers();
    // set baseline time so Date.now() is stable
    vi.setSystemTime(Date.now());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prevents immediate re-trigger and allows re-trigger after cooldown", () => {
    const rsiAlert = {
      id: "smoke-1",
      symbol: "BTC",
      indicatorType: 2,
      period: 14,
      condition: AlertCondition.RSIAbove,
      targetValue: 70,
      message: "RSI overbought",
      severity: 1,
      status: 0,
      createdAt: new Date().toISOString(),
  } as IndicatorAlert;

    alertManager.addAlert(rsiAlert);

    const triggerValue = (val: number) => {
      const active = alertManager.getActiveAlertsForSymbol("BTC");
      active.forEach((a) => {
        const possibleIA = a as IndicatorAlert;
        if (possibleIA && (possibleIA as IndicatorAlert).indicatorType !== undefined) {
          if (alertService.evaluateIndicatorAlert(possibleIA, val)) {
            const n = alertService.createNotification(possibleIA as unknown as PriceAlert, val);
            alertService.addNotification(n);
          }
        } else {
          const pa = a as PriceAlert;
          if (alertService.evaluatePriceAlert(pa, val)) {
            const n = alertService.createNotification(pa, val);
            alertService.addNotification(n);
          }
        }
      });
    };

    // First trigger should create a notification
    triggerValue(72);
    expect(alertService.getNotifications()).toHaveLength(1);

    // Immediate second trigger should NOT create a new notification due to cooldown
    triggerValue(73);
    expect(alertService.getNotifications()).toHaveLength(1);

    // Advance time by 31 seconds (cooldown is 30s) and trigger again
    vi.advanceTimersByTime(31_000);
    triggerValue(74);
    expect(alertService.getNotifications()).toHaveLength(2);
  });
});

export {};

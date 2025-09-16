import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { LiveCryptoAnalysis } from "../LiveCryptoAnalysis";
import { alertManager } from "../../services/alertManagerService";
import { alertService } from "../../services/alertService";
import { AlertCondition } from "../../types/domain";
import type { IndicatorAlert } from "../../types/domain";

// Mock useSignalR to capture indicator subscription callback
vi.mock("../../hooks/useSignalR", () => {
  let indicatorCallback: ((value: number) => void) | null = null;
  return {
    useSignalR: () => ({
      isConnected: true,
      error: null,
      subscribeToPriceUpdates: async () => {},
      subscribeToIndicatorUpdates: async (...args: unknown[]) => {
        const callback = args[3] as (value: number) => void | undefined;
        if (callback) indicatorCallback = callback;
      },
      unsubscribeFromPriceUpdates: async () => {},
      unsubscribeFromIndicatorUpdates: async () => {},
    }),
    // expose helper to trigger
    __triggerIndicator: (v: number) => {
      if (indicatorCallback) indicatorCallback(v);
    },
  };
});

// Mock cryptoService to avoid real network calls
vi.mock("../../services/cryptoService", () => ({
  cryptoService: {
    getCurrentPrice: async () => ({ price: 1, timestamp: new Date().toISOString() }),
    getHistoricalPrices: async () => ({ prices: [] }),
  },
}));

// Mock indicatorService
vi.mock("../../services/indicatorService", () => ({
  indicatorService: {
    getAvailableIndicators: async () => ({ indicators: [] }),
    getIndicatorDisplayName: (type: number) => {
      switch (type) {
        case 2:
          return "RSI";
        case 1:
          return "SMA";
        default:
          return "Indicator";
      }
    },
  },
}));

// Mock useStreamingIndicators to avoid initializing streaming service
vi.mock("../../hooks/useStreamingIndicators", () => ({
  useStreamingIndicators: () => ({
    indicatorData: {},
    isInitializing: false,
    error: null,
    updateWithNewPrice: () => {},
    isInitialized: true,
  }),
}));

describe("LiveCryptoAnalysis indicator alerts integration", () => {
  beforeEach(() => {
    alertManager.clearAll();
    alertService.clearAllNotifications();
    vi.resetAllMocks();
  });

  it("creates notification when RSI crosses threshold", async () => {
    // Add an indicator alert (RSIAbove 70)
    const rsiAlert = {
      id: "ia-1",
      symbol: "BTC",
      indicatorType: 2, // RSI
      period: 14,
      condition: AlertCondition.RSIAbove,
      targetValue: 70,
      message: "RSI overbought",
      severity: 1,
      status: 0,
      createdAt: new Date().toISOString(),
    } as IndicatorAlert;

    alertManager.addAlert(rsiAlert);

    // Render the page (this will subscribe to indicator updates)
    const imported = (await import("../../hooks/useSignalR")) as {
      __triggerIndicator?: (v: number) => void;
    };
    const { __triggerIndicator } = imported;

    render(<LiveCryptoAnalysis />);

    // Disable live updates (switch to SignalR path) so the SignalR subscription effect runs
    act(() => {
      const toggle = document.querySelector(
        'button[title="Disable live price updates"]',
      ) as HTMLButtonElement | null;
      if (toggle) toggle.click();
    });

    // wait a tick for effects to run and subscription to be registered
    await act(async () => {
      await Promise.resolve();
    });

    // Simulate indicator update above threshold
    act(() => {
      if (__triggerIndicator) __triggerIndicator(72);
    });

    const notifs = alertService.getNotifications();
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    const notif = notifs.find((n) => n.alertId === "ia-1");
    expect(notif).toBeDefined();
    expect(notif?.currentValue).toBe(72);
  });
});

export {};

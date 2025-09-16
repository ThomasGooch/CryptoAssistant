import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { LiveCryptoAnalysis } from "../LiveCryptoAnalysis";
import { alertManager } from "../../services/alertManagerService";
import { alertService } from "../../services/alertService";
import { AlertCondition } from "../../types/domain";
import type { IndicatorAlert } from "../../types/domain";

// Mock streamingIndicatorService to capture subscription callback
vi.mock("../../services/streamingIndicatorService", () => {
  let callback: ((v: { value: number; timestamp: string | Date }) => void) | null = null;
  return {
    streamingIndicatorService: {
      initializeIndicator: () => {
        return "sub-key";
      },
      subscribeToIndicator: (_symbol: string, _type: number, _period: number, cb: (v: { value: number; timestamp: string | Date }) => void) => {
        callback = cb;
        return "sub-key";
      },
  unsubscribeFromIndicator: () => {},
      getCurrentValue: () => null,
      updateIndicator: () => null,
      clearAll: () => {},
    },
    // helper for tests
    __triggerStreamingIndicator: (v: number) => {
      if (callback) callback({ value: v, timestamp: new Date().toISOString() });
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

// Mock useCoinbaseWebSocket to avoid real WebSocket attempts
vi.mock("../../hooks/useCoinbaseWebSocket", () => ({
  useCoinbaseWebSocket: () => ({ isConnected: false, error: null }),
}));

describe("LiveCryptoAnalysis streaming indicator alerts integration", () => {
  beforeEach(() => {
    alertManager.clearAll();
    alertService.clearAllNotifications();
    vi.resetAllMocks();
  });

  it("creates notification when RSI crosses threshold on streaming updates", async () => {
    // Add an indicator alert (RSIAbove 70)
    const rsiAlert = {
      id: "sia-1",
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

    const imported = (await import("../../services/streamingIndicatorService")) as {
      __triggerStreamingIndicator?: (v: number) => void;
    };
    const { __triggerStreamingIndicator } = imported;

    render(<LiveCryptoAnalysis />);

    // wait a tick for the hook to initialize and subscribe
    await act(async () => {
      await Promise.resolve();
    });

    // Trigger a streaming RSI value above threshold
    act(() => {
      if (__triggerStreamingIndicator) __triggerStreamingIndicator(72);
    });

    const notifs = alertService.getNotifications();
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    const notif = notifs.find((n) => n.alertId === "sia-1");
    expect(notif).toBeDefined();
    expect(notif?.currentValue).toBe(72);
  });
});

export {};

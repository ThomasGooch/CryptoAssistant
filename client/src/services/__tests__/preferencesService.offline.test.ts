import { describe, it, expect, vi } from "vitest";
import { preferencesService } from "../preferencesService";

describe("PreferencesService Offline/Error Handling", () => {
  // Mock fetch to simulate backend unavailable
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle server unavailable gracefully and return defaults", async () => {
    // Mock fetch to simulate server error
    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    const preferences = await preferencesService.getUserPreferences("test-user");

    expect(preferences).toBeDefined();
    expect(preferences.userId).toBe("guest"); // Should get hardcoded defaults
    expect(preferences.chart).toBeDefined();
    expect(preferences.ui.showAdvancedFeatures).toBe(true); // Elliott Wave features enabled
    expect(preferences.favoritePairs).toContain("BTC-USD");
    expect(preferences.favoritePairs).toContain("ADA-USD");
    expect(preferences.favoritePairs).toContain("SOL-USD");
  });

  it("should handle 500 Internal Server Error gracefully", async () => {
    // Mock fetch to return 500 error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockResolvedValue({}),
    });

    const preferences = await preferencesService.getUserPreferences("test-user");

    expect(preferences).toBeDefined();
    expect(preferences.userId).toBe("guest"); // Should get hardcoded defaults
    expect(preferences.ui.showAdvancedFeatures).toBe(true);
  });

  it("should handle 404 Not Found and return defaults", async () => {
    // Mock fetch to return 404
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: vi.fn().mockResolvedValue({}),
    });

    const preferences = await preferencesService.getUserPreferences("new-user");

    expect(preferences).toBeDefined();
    expect(preferences.userId).toBe("guest");
    expect(preferences.ui.showAdvancedFeatures).toBe(true);
  });

  it("should handle malformed JSON response gracefully", async () => {
    // Mock fetch to return invalid JSON
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
    });

    const preferences = await preferencesService.getUserPreferences("test-user");

    expect(preferences).toBeDefined();
    expect(preferences.userId).toBe("guest");
  });

  it("should return defaults with Elliott Wave preferences enabled", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const preferences = await preferencesService.getDefaultPreferences();

    expect(preferences).toBeDefined();
    expect(preferences.ui.showAdvancedFeatures).toBe(true);
    expect(preferences.favoritePairs).toEqual(["BTC-USD", "ETH-USD", "ADA-USD", "SOL-USD"]);
    expect(preferences.chart.type).toBe("line");
    expect(preferences.chart.showVolume).toBe(true);
    expect(preferences.ui.refreshInterval).toBe(5000);
  });

  it("should not throw errors when backend is completely unavailable", async () => {
    // Simulate complete network failure
    global.fetch = vi.fn().mockRejectedValue(new Error("TypeError: Failed to fetch"));

    // These should not throw
    await expect(preferencesService.getUserPreferences("test")).resolves.toBeDefined();
    await expect(preferencesService.getDefaultPreferences()).resolves.toBeDefined();
  });

  it("should handle preferences save gracefully when backend unavailable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const testPreferences = {
      chart: { type: "candlestick" as const }
    };

    // Save should throw since we can't save without backend
    await expect(preferencesService.saveUserPreferences("test", testPreferences))
      .rejects.toThrow();
  });

  it("should provide appropriate default values for Elliott Wave integration", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("No backend"));

    const preferences = await preferencesService.getUserPreferences("test");

    // Verify Elliott Wave friendly defaults
    expect(preferences.ui.showAdvancedFeatures).toBe(true);
    expect(preferences.favoritePairs.length).toBeGreaterThan(2); // Multiple symbols for Elliott Wave analysis
    expect(preferences.chart.showVolume).toBe(true); // Volume useful for Elliott Wave
    expect(preferences.chart.showGrid).toBe(true); // Grid helps with pattern visualization
    expect(preferences.ui.refreshInterval).toBeLessThanOrEqual(10000); // Frequent updates for pattern detection
    
    console.log("✅ Preferences Offline Test Results:");
    console.log(`   - Elliott Wave features enabled: ${preferences.ui.showAdvancedFeatures}`);
    console.log(`   - Available symbols: ${preferences.favoritePairs.join(', ')}`);
    console.log(`   - Chart type: ${preferences.chart.type}`);
    console.log(`   - Volume display: ${preferences.chart.showVolume}`);
    console.log(`   - Refresh interval: ${preferences.ui.refreshInterval}ms`);
  });
});
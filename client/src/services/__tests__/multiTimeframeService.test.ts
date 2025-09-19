import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDateRange } from "../multiTimeframeService";

describe("multiTimeframeService", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Mock Date to get consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  describe("createDateRange", () => {
    it("creates correct date range for 7 days", () => {
      const result = createDateRange(7);

      expect(result.days).toBe(7);
      expect(result.startTime).toBe("2025-01-08T12:00:00.000Z");
      expect(result.endTime).toBe("2025-01-15T12:00:00.000Z");
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("creates correct date range for 30 days", () => {
      const result = createDateRange(30);

      expect(result.days).toBe(30);
      expect(result.startTime).toBe("2024-12-16T12:00:00.000Z");
      expect(result.endTime).toBe("2025-01-15T12:00:00.000Z");
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("creates correct date range for 90 days", () => {
      const result = createDateRange(90);

      expect(result.days).toBe(90);
      // Handle timezone differences between local and CI environments
      expect([
        "2024-10-17T11:00:00.000Z",
        "2024-10-17T12:00:00.000Z",
      ]).toContain(result.startTime);
      expect(result.endTime).toBe("2025-01-15T12:00:00.000Z");
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("limits range to 90 days when requesting more than 90 days", () => {
      const result = createDateRange(365);

      expect(result.days).toBe(90);
      // Handle timezone differences between local and CI environments
      expect([
        "2024-10-17T11:00:00.000Z",
        "2024-10-17T12:00:00.000Z",
      ]).toContain(result.startTime);
      expect(result.endTime).toBe("2025-01-15T12:00:00.000Z");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Date range adjusted from 365 days to 90 days due to API limitations",
      );
    });

    it("limits range to 90 days when requesting 120 days", () => {
      const result = createDateRange(120);

      expect(result.days).toBe(90);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Date range adjusted from 120 days to 90 days due to API limitations",
      );
    });

    it("does not limit range for exactly 90 days", () => {
      const result = createDateRange(90);

      expect(result.days).toBe(90);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("handles edge case of 91 days", () => {
      const result = createDateRange(91);

      expect(result.days).toBe(90);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Date range adjusted from 91 days to 90 days due to API limitations",
      );
    });
  });
});

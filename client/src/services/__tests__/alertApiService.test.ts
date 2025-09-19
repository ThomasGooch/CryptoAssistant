import { describe, it, expect, beforeEach, vi } from "vitest";
import { alertApiService } from "../alertApiService";
import type { AlertResponse, CreateAlertRequest, UpdateAlertRequest } from "../../types/api";

// Mock fetch using vi.mock
vi.mock('global', () => ({
  fetch: vi.fn(),
}));

const mockFetch = vi.fn();

// Override global fetch for each test
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
});

describe("AlertApiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserAlerts", () => {
    it("should fetch user alerts successfully", async () => {
      const userId = "user123";
      const mockAlerts: AlertResponse[] = [
        {
          id: "alert1",
          userId: "user123",
          symbol: "BTC",
          threshold: 50000,
          condition: "Above",
          title: "BTC High Alert",
          message: "BTC exceeded $50,000",
          isActive: true,
          isTriggered: false,
          createdAt: "2023-01-01T00:00:00Z",
          cooldownSeconds: 30,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      });

      const result = await alertApiService.getUserAlerts(userId);

      expect(mockFetch).toHaveBeenCalledWith("/api/alerts/user123");
      expect(result).toEqual(mockAlerts);
    });

    it("should fetch user alerts with query parameters", async () => {
      const userId = "user123";
      const mockAlerts: AlertResponse[] = [];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      });

      await alertApiService.getUserAlerts(userId, true, false);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/alerts/user123?onlyActive=true&onlyTriggered=false"
      );
    });

    it("should throw error when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        alertApiService.getUserAlerts("user123")
      ).rejects.toThrow("Failed to fetch user alerts: Not Found");
    });
  });

  describe("createAlert", () => {
    it("should create alert successfully", async () => {
      const createRequest: CreateAlertRequest = {
        userId: "user123",
        symbol: "BTC",
        threshold: 50000,
        condition: "Above",
        title: "BTC High Alert",
        message: "BTC exceeded $50,000",
        cooldownSeconds: 30,
      };

      const mockResponse: AlertResponse = {
        id: "alert1",
        ...createRequest,
        isActive: true,
        isTriggered: false,
        createdAt: "2023-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await alertApiService.createAlert(createRequest);

      expect(mockFetch).toHaveBeenCalledWith("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createRequest),
      });
      expect(result).toEqual(mockResponse);
    });

    it("should throw error when create fails", async () => {
      const createRequest: CreateAlertRequest = {
        userId: "user123",
        symbol: "BTC",
        threshold: 50000,
        condition: "Above",
        title: "BTC High Alert",
        message: "BTC exceeded $50,000",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      await expect(
        alertApiService.createAlert(createRequest)
      ).rejects.toThrow("Failed to create alert: Bad Request");
    });
  });

  describe("updateAlert", () => {
    it("should update alert successfully", async () => {
      const alertId = "alert1";
      const updateRequest: UpdateAlertRequest = {
        threshold: 55000,
        isActive: false,
        cooldownSeconds: 60,
      };

      const mockResponse: AlertResponse = {
        id: "alert1",
        userId: "user123",
        symbol: "BTC",
        threshold: 55000,
        condition: "Above",
        title: "BTC High Alert",
        message: "BTC exceeded $50,000",
        isActive: false,
        isTriggered: false,
        createdAt: "2023-01-01T00:00:00Z",
        cooldownSeconds: 60,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await alertApiService.updateAlert(alertId, updateRequest);

      expect(mockFetch).toHaveBeenCalledWith("/api/alerts/alert1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateRequest),
      });
      expect(result).toEqual(mockResponse);
    });

    it("should throw error when update fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        alertApiService.updateAlert("alert1", { isActive: false })
      ).rejects.toThrow("Failed to update alert: Not Found");
    });
  });

  describe("deleteAlert", () => {
    it("should delete alert successfully", async () => {
      const alertId = "alert1";

      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await alertApiService.deleteAlert(alertId);

      expect(mockFetch).toHaveBeenCalledWith("/api/alerts/alert1", {
        method: "DELETE",
      });
    });

    it("should throw error when delete fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        alertApiService.deleteAlert("alert1")
      ).rejects.toThrow("Failed to delete alert: Not Found");
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        alertApiService.getUserAlerts("user123")
      ).rejects.toThrow("Network error");
    });

    it("should handle JSON parsing errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(
        alertApiService.getUserAlerts("user123")
      ).rejects.toThrow("Invalid JSON");
    });
  });
});
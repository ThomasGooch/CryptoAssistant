import { describe, it, expect, vi, beforeEach } from "vitest";
import { alertManagerServiceV2 } from "../alertManagerServiceV2";
import { AlertCondition, AlertSeverity, AlertStatus } from "../../types/domain";
import type { PriceAlert } from "../../types/domain";
import type { AlertResponse, CreateAlertRequest } from "../../types/api";

// Mock the dependencies
vi.mock("../alertApiService", () => ({
  alertApiService: {
    getUserAlerts: vi.fn(),
    createAlert: vi.fn(),
    updateAlert: vi.fn(),
    deleteAlert: vi.fn(),
  },
}));

vi.mock("../alertMappingService", () => ({
  alertMappingService: {
    apiToFrontend: vi.fn(),
    frontendToCreateRequest: vi.fn(),
    frontendToUpdateRequest: vi.fn(),
  },
}));

import { alertApiService } from "../alertApiService";
import { alertMappingService } from "../alertMappingService";

const mockAlertApiService = vi.mocked(alertApiService);
const mockAlertMappingService = vi.mocked(alertMappingService);

describe("AlertManagerServiceV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPriceAlert: PriceAlert = {
    id: "alert-1",
    symbol: "BTC",
    condition: AlertCondition.PriceAbove,
    targetValue: 50000,
    message: "Bitcoin above $50k",
    severity: AlertSeverity.Info,
    status: AlertStatus.Active,
    createdAt: "2023-01-01T00:00:00Z",
    cooldownSeconds: 30,
  };

  const mockApiAlert: AlertResponse = {
    id: "alert-1",
    userId: "default-user",
    symbol: "BTC",
    threshold: 50000,
    condition: "Above",
    title: "BTC Alert",
    message: "Bitcoin above $50k",
    isActive: true,
    isTriggered: false,
    createdAt: "2023-01-01T00:00:00Z",
    cooldownSeconds: 30,
  };

  describe("getAlerts", () => {
    it("should fetch and map alerts from API", async () => {
      mockAlertApiService.getUserAlerts.mockResolvedValue([mockApiAlert]);
      mockAlertMappingService.apiToFrontend.mockReturnValue(mockPriceAlert);

      const result = await alertManagerServiceV2.getAlerts();

      expect(mockAlertApiService.getUserAlerts).toHaveBeenCalledWith("default-user");
      expect(mockAlertMappingService.apiToFrontend).toHaveBeenCalledWith(mockApiAlert);
      expect(result).toEqual([mockPriceAlert]);
    });

    it("should return empty array on API error", async () => {
      mockAlertApiService.getUserAlerts.mockRejectedValue(new Error("API Error"));

      const result = await alertManagerServiceV2.getAlerts();

      expect(result).toEqual([]);
    });
  });

  describe("getActiveAlerts", () => {
    it("should fetch only active alerts", async () => {
      mockAlertApiService.getUserAlerts.mockResolvedValue([mockApiAlert]);
      mockAlertMappingService.apiToFrontend.mockReturnValue(mockPriceAlert);

      const result = await alertManagerServiceV2.getActiveAlerts();

      expect(mockAlertApiService.getUserAlerts).toHaveBeenCalledWith("default-user", true, false);
      expect(result).toEqual([mockPriceAlert]);
    });
  });

  describe("addAlert", () => {
    it("should create alert via API", async () => {
      const newAlert = {
        symbol: "BTC",
        condition: AlertCondition.PriceAbove,
        targetValue: 50000,
        message: "Bitcoin above $50k",
        severity: AlertSeverity.Info,
        status: AlertStatus.Active,
        createdAt: "2023-01-01T00:00:00Z",
        cooldownSeconds: 30,
      };

      const mockCreateRequest: CreateAlertRequest = {
        userId: "default-user",
        symbol: "BTC",
        threshold: 50000,
        condition: "Above",
        title: "BTC Alert",
        message: "Bitcoin above $50k",
        cooldownSeconds: 30,
      };

      mockAlertMappingService.frontendToCreateRequest.mockReturnValue(mockCreateRequest);
      mockAlertApiService.createAlert.mockResolvedValue(mockApiAlert);
      mockAlertMappingService.apiToFrontend.mockReturnValue(mockPriceAlert);

      const result = await alertManagerServiceV2.addAlert(newAlert);

      expect(mockAlertMappingService.frontendToCreateRequest).toHaveBeenCalledWith(
        expect.objectContaining(newAlert),
        "default-user"
      );
      expect(mockAlertApiService.createAlert).toHaveBeenCalledWith(mockCreateRequest);
      expect(result).toEqual(mockPriceAlert);
    });

    it("should throw error when API fails", async () => {
      const newAlert = {
        symbol: "BTC",
        condition: AlertCondition.PriceAbove,
        targetValue: 50000,
        message: "Bitcoin above $50k",
        severity: AlertSeverity.Info,
        status: AlertStatus.Active,
        createdAt: "2023-01-01T00:00:00Z",
      };

      mockAlertMappingService.frontendToCreateRequest.mockReturnValue({} as any);
      mockAlertApiService.createAlert.mockRejectedValue(new Error("API Error"));

      await expect(alertManagerServiceV2.addAlert(newAlert)).rejects.toThrow("API Error");
    });
  });

  describe("removeAlert", () => {
    it("should delete alert via API", async () => {
      mockAlertApiService.deleteAlert.mockResolvedValue();

      await alertManagerServiceV2.removeAlert("alert-1");

      expect(mockAlertApiService.deleteAlert).toHaveBeenCalledWith("alert-1");
    });

    it("should throw error when API fails", async () => {
      mockAlertApiService.deleteAlert.mockRejectedValue(new Error("API Error"));

      await expect(alertManagerServiceV2.removeAlert("alert-1")).rejects.toThrow("API Error");
    });
  });

  describe("user management", () => {
    it("should set and get user ID", () => {
      alertManagerServiceV2.setUserId("user123");
      expect(alertManagerServiceV2.getUserId()).toBe("user123");
    });

    it("should use new user ID for API calls", async () => {
      alertManagerServiceV2.setUserId("user123");
      mockAlertApiService.getUserAlerts.mockResolvedValue([]);

      await alertManagerServiceV2.getAlerts();

      expect(mockAlertApiService.getUserAlerts).toHaveBeenCalledWith("user123");
    });
  });
});
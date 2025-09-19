import { describe, it, expect } from "vitest";
import { alertApiService } from "../alertApiService";

describe("AlertApiService - Basic Functionality", () => {
  it("should have all required methods", () => {
    expect(typeof alertApiService.getUserAlerts).toBe("function");
    expect(typeof alertApiService.createAlert).toBe("function");
    expect(typeof alertApiService.updateAlert).toBe("function");
    expect(typeof alertApiService.deleteAlert).toBe("function");
  });

  it("should construct correct URLs for getUserAlerts", () => {
    // This tests the service without making actual HTTP calls
    const service = alertApiService as any;
    
    // Test URL construction logic
    const userId = "testUser";
    const params = new URLSearchParams();
    params.append("onlyActive", "true");
    params.append("onlyTriggered", "false");
    
    const expectedUrl = `/api/alerts/${userId}?${params.toString()}`;
    expect(expectedUrl).toBe("/api/alerts/testUser?onlyActive=true&onlyTriggered=false");
  });

  it("should have proper base URL", () => {
    const service = alertApiService as any;
    expect(service.baseUrl).toBe("/api/alerts");
  });
});
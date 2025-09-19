import { describe, it, expect, vi, beforeEach } from "vitest";
import * as signalR from "@microsoft/signalr";

// Mock SignalR
vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: vi.fn(),
  HubConnectionState: {
    Connected: "Connected",
    Disconnected: "Disconnected",
  },
  LogLevel: {
    Information: "Information",
  },
  HttpTransportType: {
    WebSockets: 1,
    LongPolling: 2,
  },
}));

// Import after mocking
import { signalRAlertService } from "../signalRAlertService";
import type { SignalRAlertNotification } from "../../types/domain";

describe("SignalRAlertService", () => {
  let mockConnection: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock connection
    mockConnection = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      invoke: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      onreconnected: vi.fn(),
      onreconnecting: vi.fn(),
      onclose: vi.fn(),
      state: signalR.HubConnectionState.Connected,
    };

    // Mock the builder chain
    const mockBuilder = {
      withUrl: vi.fn().mockReturnThis(),
      withAutomaticReconnect: vi.fn().mockReturnThis(),
      configureLogging: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue(mockConnection),
    };

    (signalR.HubConnectionBuilder as any).mockImplementation(() => mockBuilder);
  });

  describe("initialization and connection", () => {
    it("should create SignalR connection with correct hub URL", async () => {
      await signalRAlertService.startConnection();
      
      const mockBuilder = (signalR.HubConnectionBuilder as any).mock.results[0].value;
      expect(mockBuilder.withUrl).toHaveBeenCalledWith(
        "http://localhost:5052/hubs/crypto",
        expect.any(Object)
      );
    });

    it("should register ReceiveAlertNotification handler", async () => {
      await signalRAlertService.startConnection();
      
      expect(mockConnection.on).toHaveBeenCalledWith(
        "ReceiveAlertNotification",
        expect.any(Function)
      );
    });

    it("should start connection successfully", async () => {
      await signalRAlertService.startConnection();
      
      expect(mockConnection.start).toHaveBeenCalled();
    });
  });

  describe("alert subscription", () => {
    beforeEach(async () => {
      await signalRAlertService.startConnection();
    });

    it("should subscribe to alerts for a user", async () => {
      const userId = "user123";
      
      await signalRAlertService.subscribeToAlerts(userId);
      
      expect(mockConnection.invoke).toHaveBeenCalledWith("SubscribeToAlerts", userId);
    });

    it("should throw error when subscribing without connection", async () => {
      const service = new (signalRAlertService.constructor as any)();
      
      await expect(service.subscribeToAlerts("user123")).rejects.toThrow(
        "SignalR connection not established"
      );
    });

    it("should unsubscribe from alerts for a user", async () => {
      const userId = "user123";
      
      await signalRAlertService.unsubscribeFromAlerts(userId);
      
      expect(mockConnection.invoke).toHaveBeenCalledWith("UnsubscribeFromAlerts", userId);
    });
  });

  describe("alert notification handling", () => {
    let alertNotificationCallback: (notification: SignalRAlertNotification) => void;
    
    beforeEach(async () => {
      await signalRAlertService.startConnection();
      
      // Capture the registered callback
      const onCall = mockConnection.on.mock.calls.find(
        (call: any) => call[0] === "ReceiveAlertNotification"
      );
      alertNotificationCallback = onCall[1];
    });

    it("should handle incoming alert notifications", () => {
      const mockNotification = {
        AlertId: "alert-123",
        UserId: "user123",
        Symbol: "BTC",
        Title: "BTC Alert",
        Message: "Bitcoin above $50,000",
        Threshold: 50000,
        Condition: "Above",
        TriggerPrice: 50100,
        TriggerTime: "2023-01-01T12:00:00Z",
        Type: "alert_triggered"
      };
      
      const callback = vi.fn();
      signalRAlertService.onAlertNotification(callback);
      
      // Simulate receiving notification from SignalR
      alertNotificationCallback(mockNotification);
      
      expect(callback).toHaveBeenCalledWith(mockNotification);
    });

    it("should support multiple notification subscribers", () => {
      const mockNotification = {
        AlertId: "alert-123",
        UserId: "user123",
        Symbol: "BTC",
        Title: "BTC Alert",
        Message: "Bitcoin above $50,000",
        Threshold: 50000,
        Condition: "Above",
        TriggerPrice: 50100,
        TriggerTime: "2023-01-01T12:00:00Z",
        Type: "alert_triggered"
      };
      
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      signalRAlertService.onAlertNotification(callback1);
      signalRAlertService.onAlertNotification(callback2);
      
      alertNotificationCallback(mockNotification);
      
      expect(callback1).toHaveBeenCalledWith(mockNotification);
      expect(callback2).toHaveBeenCalledWith(mockNotification);
    });

    it("should allow unsubscribing from notifications", () => {
      const mockNotification = {
        AlertId: "alert-123",
        UserId: "user123",
        Symbol: "BTC",
        Title: "BTC Alert", 
        Message: "Bitcoin above $50,000",
        Threshold: 50000,
        Condition: "Above",
        TriggerPrice: 50100,
        TriggerTime: "2023-01-01T12:00:00Z",
        Type: "alert_triggered"
      };
      
      const callback = vi.fn();
      
      signalRAlertService.onAlertNotification(callback);
      signalRAlertService.offAlertNotification(callback);
      
      alertNotificationCallback(mockNotification);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("connection cleanup", () => {
    it("should stop connection and clear callbacks", async () => {
      await signalRAlertService.startConnection();
      
      const callback = vi.fn();
      signalRAlertService.onAlertNotification(callback);
      
      await signalRAlertService.stopConnection();
      
      expect(mockConnection.stop).toHaveBeenCalled();
    });
  });
});
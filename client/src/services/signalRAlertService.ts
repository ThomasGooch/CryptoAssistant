import * as signalR from "@microsoft/signalr";
import type { SignalRAlertNotification } from "../types/domain";

/**
 * Service for handling real-time alert notifications via SignalR
 */
class SignalRAlertService {
  private connection: signalR.HubConnection | null = null;
  private alertNotificationCallbacks: Set<(notification: SignalRAlertNotification) => void> = new Set();

  /**
   * Start the SignalR connection for alerts
   * @returns Promise that resolves when connected
   */
  public async startConnection(): Promise<void> {
    const hubUrl = import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL.replace("/api", "")}/hubs/crypto`
      : "http://localhost:5052/hubs/crypto";

    console.log(`Connecting to SignalR hub for alerts: ${hubUrl}`);

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register handler for incoming alert notifications
    this.connection.on(
      "ReceiveAlertNotification",
      (notification: SignalRAlertNotification) => {
        this.notifyAlertCallbacks(notification);
      }
    );

    // Add error handlers
    this.connection.onclose((error) => {
      console.error("❌ SignalR alert connection closed:", error);
    });

    this.connection.onreconnecting((error) => {
      console.warn("🔄 SignalR alert connection reconnecting:", error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log("✅ SignalR alert connection reconnected:", connectionId);
    });

    try {
      await this.connection.start();
      console.log("✅ SignalR alert connection established successfully");
    } catch (err) {
      console.error("❌ SignalR alert connection error:", err);
      throw err;
    }
  }

  /**
   * Subscribe to alert notifications for a specific user
   * @param userId The user ID to subscribe to
   */
  public async subscribeToAlerts(userId: string): Promise<void> {
    if (!this.connection) {
      throw new Error("SignalR connection not established");
    }

    if (!userId) {
      throw new Error("User ID cannot be empty");
    }

    try {
      await this.connection.invoke("SubscribeToAlerts", userId);
      console.log(`✅ Subscribed to alerts for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error subscribing to alerts for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from alert notifications for a specific user
   * @param userId The user ID to unsubscribe from
   */
  public async unsubscribeFromAlerts(userId: string): Promise<void> {
    if (!this.connection) {
      throw new Error("SignalR connection not established");
    }

    if (!userId) {
      throw new Error("User ID cannot be empty");
    }

    try {
      await this.connection.invoke("UnsubscribeFromAlerts", userId);
      console.log(`✅ Unsubscribed from alerts for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error unsubscribing from alerts for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Register a callback for alert notifications
   * @param callback Function to call when alert notifications are received
   */
  public onAlertNotification(callback: (notification: SignalRAlertNotification) => void): void {
    this.alertNotificationCallbacks.add(callback);
  }

  /**
   * Remove a callback for alert notifications
   * @param callback Function to remove from alert notification callbacks
   */
  public offAlertNotification(callback: (notification: SignalRAlertNotification) => void): void {
    this.alertNotificationCallbacks.delete(callback);
  }

  /**
   * Stop the SignalR connection
   */
  public async stopConnection(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log("🔌 SignalR alert connection stopped");
      } catch (error) {
        console.warn("Error stopping SignalR alert connection:", error);
      }
      this.alertNotificationCallbacks.clear();
    }
  }

  /**
   * Get current connection status
   */
  public get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Notify all registered callbacks about an alert notification
   * @param notification The alert notification to broadcast
   */
  private notifyAlertCallbacks(notification: SignalRAlertNotification): void {
    console.log("🔔 Received alert notification:", notification);
    this.alertNotificationCallbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error("Error in alert notification callback:", error);
      }
    });
  }
}

// Create a singleton instance
export const signalRAlertService = new SignalRAlertService();
export default signalRAlertService;
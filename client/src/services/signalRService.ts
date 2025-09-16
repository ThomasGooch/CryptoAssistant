import * as signalR from "@microsoft/signalr";
import { IndicatorType, Timeframe } from "../types/domain";

/**
 * Service for SignalR real-time connections
 */
class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private priceUpdateCallbacks: Map<string, (price: number) => void> =
    new Map();
  private indicatorUpdateCallbacks: Map<string, (value: number) => void> =
    new Map();
  private readonly reconnectedCallbacks: Set<() => void> = new Set();
  private readonly stateChangeCallbacks: Set<
    (state: { isConnected: boolean; error: Error | null }) => void
  > = new Set();
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts = 3;
  private fallbackMode = false;

  /**
   * Start the SignalR connection
   * @returns Promise that resolves when connected
   */
  public async startConnection(): Promise<void> {
    const hubUrl = import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL.replace("/api", "")}/hubs/crypto`
      : "http://localhost:5052/hubs/crypto";

    console.log(`Connecting to SignalR hub: ${hubUrl}`);

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000]) // Custom retry delays
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Add error handler
    this.connection.onclose((error) => {
      console.error("❌ SignalR connection closed:", error);
      this.notifyStateChange({ isConnected: false, error: error || null });
    });

    this.connection.onreconnecting((error) => {
      console.warn("🔄 SignalR reconnecting:", error);
      this.notifyStateChange({ isConnected: false, error: error || null });
    });

    this.connection.onreconnected((connectionId) => {
      console.log("✅ SignalR reconnected:", connectionId);
      this.notifyReconnected();
      this.notifyStateChange({ isConnected: true, error: null });
    });

    // Register handlers for incoming messages
    this.connection.on(
      "ReceivePriceUpdate",
      (symbol: string, price: number) => {
        const callback = this.priceUpdateCallbacks.get(symbol.toLowerCase());
        if (callback) {
          callback(price);
        }
      },
    );

    this.connection.on(
      "ReceiveIndicatorUpdate",
      (symbol: string, indicatorType: IndicatorType, value: number) => {
        const key = `${symbol.toLowerCase()}_${indicatorType}`;
        const callback = this.indicatorUpdateCallbacks.get(key);
        if (callback) {
          callback(value);
        }
      },
    );

    try {
      console.log(
        `🔌 Starting SignalR connection (attempt ${this.connectionAttempts + 1}/${this.maxConnectionAttempts})...`,
      );
      this.connectionAttempts++;

      await this.connection.start();
      console.log("✅ SignalR connected successfully");
      this.connectionAttempts = 0; // Reset on successful connection
      this.fallbackMode = false;
      this.notifyStateChange({ isConnected: true, error: null });
    } catch (err) {
      console.error("❌ SignalR connection error:", err);

      // Provide more specific error guidance
      if (err instanceof Error) {
        if (err.message.includes("negotiate")) {
          console.error(
            "🔍 Negotiation failed - check if backend is running on correct port",
          );
        } else if (err.message.includes("CORS")) {
          console.error("🔍 CORS error - check backend CORS configuration");
        } else if (err.message.includes("timeout")) {
          console.error("🔍 Connection timeout - backend may be overloaded");
        } else if (err.message.includes("AbortError")) {
          console.error(
            "🔍 Connection aborted - likely network or firewall issue",
          );
        }
      }

      // Enable fallback mode after max attempts
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.warn(
          "⚠️ Max SignalR connection attempts reached. Enabling fallback mode.",
        );
        this.fallbackMode = true;
        this.notifyStateChange({ isConnected: false, error: err as Error });
        // Don't throw error in fallback mode - let the app continue without real-time updates
        return;
      }

      this.notifyStateChange({ isConnected: false, error: err as Error });
      throw err;
    }
  }

  /**
   * Subscribe to price updates for a symbol
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param callback Function to call when price updates are received
   */
  public async subscribeToSymbol(
    symbol: string,
    callback: (price: number) => void,
  ): Promise<void> {
    if (this.fallbackMode) {
      console.warn("📡 SignalR in fallback mode - skipping subscription");
      return;
    }

    if (!this.connection) {
      throw new Error("SignalR connection not initialized");
    }

    const trimmedSymbol = symbol?.trim();

    // First, unsubscribe from all current subscriptions
    await this.unsubscribeFromAllSymbols();
    this.priceUpdateCallbacks.clear();

    if (!trimmedSymbol) {
      return;
    }

    try {
      // Add new subscription
      await this.connection.invoke(
        "SubscribeToSymbol",
        trimmedSymbol.toUpperCase(),
      );
      this.priceUpdateCallbacks.set(trimmedSymbol.toLowerCase(), callback);
    } catch (err) {
      console.error("Error subscribing to symbol:", err);
      throw err;
    }
  }

  /**
   * Unsubscribe from price updates for a symbol
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   */
  private async unsubscribeFromAllSymbols(): Promise<void> {
    if (!this.connection) {
      return;
    }

    const symbols = Array.from(this.priceUpdateCallbacks.keys());
    for (const symbol of symbols) {
      try {
        await this.connection.invoke(
          "UnsubscribeFromSymbol",
          symbol.toUpperCase(),
        );
      } catch (err) {
        console.warn("Error unsubscribing from symbol:", symbol, err);
      }
    }
  }

  public async unsubscribeFromSymbol(symbol: string): Promise<void> {
    if (!this.connection) {
      throw new Error("SignalR connection not established");
    }

    const trimmedSymbol = symbol?.trim().toLowerCase();
    if (!trimmedSymbol) return;

    this.priceUpdateCallbacks.delete(trimmedSymbol);
    try {
      await this.connection.invoke(
        "UnsubscribeFromSymbol",
        trimmedSymbol.toUpperCase(),
      );
    } catch (err) {
      console.warn("Error unsubscribing from symbol:", symbol, err);
    }
  }

  /**
   * Subscribe to indicator updates
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param indicatorType The indicator type
   * @param period The period for calculation
   * @param callback Function to call when indicator updates are received
   * @param timeframe Optional timeframe
   */
  public async subscribeToIndicator(
    symbol: string,
    indicatorType: IndicatorType,
    period: number,
    callback: (value: number) => void,
    timeframe?: Timeframe,
  ): Promise<void> {
    if (!this.connection) {
      throw new Error("SignalR connection not established");
    }

    const trimmedSymbol = symbol?.trim();
    if (!trimmedSymbol) {
      // Clear callbacks but don't throw error
      this.indicatorUpdateCallbacks.clear();
      return;
    }

    try {
      // Remove old subscription if exists
      const oldKey = Array.from(this.indicatorUpdateCallbacks.keys())[0];
      if (oldKey) {
        const [oldSymbol, oldType] = oldKey.split("_");
        try {
          await this.connection.invoke(
            "UnsubscribeFromIndicator",
            oldSymbol.toUpperCase(),
            Number(oldType),
          );
        } catch (err) {
          console.warn("Error unsubscribing from old indicator:", err);
        }
        this.indicatorUpdateCallbacks.delete(oldKey);
      }

      const key = `${trimmedSymbol.toLowerCase()}_${indicatorType}`;
      this.indicatorUpdateCallbacks.set(key, callback);

      if (timeframe !== undefined) {
        await this.connection.invoke(
          "SubscribeToIndicatorWithTimeframe",
          trimmedSymbol.toUpperCase(),
          indicatorType,
          period,
          timeframe,
        );
      } else {
        await this.connection.invoke(
          "SubscribeToIndicator",
          trimmedSymbol.toUpperCase(),
          indicatorType,
          period,
        );
      }
    } catch (err) {
      console.error("Error subscribing to indicator:", err);
      this.indicatorUpdateCallbacks.clear();
      throw err;
    }
  }

  /**
   * Unsubscribe from indicator updates
   * @param symbol The cryptocurrency symbol (e.g., BTC)
   * @param indicatorType The indicator type
   * @param timeframe Optional timeframe
   */
  public async unsubscribeFromIndicator(
    symbol: string,
    indicatorType: IndicatorType,
    timeframe?: Timeframe,
  ): Promise<void> {
    if (!this.connection) {
      throw new Error("SignalR connection not established");
    }

    const key = `${symbol.toLowerCase()}_${indicatorType}`;
    this.indicatorUpdateCallbacks.delete(key);

    if (timeframe !== undefined) {
      await this.connection.invoke(
        "UnsubscribeFromIndicatorWithTimeframe",
        symbol,
        indicatorType,
        timeframe,
      );
    } else {
      await this.connection.invoke(
        "UnsubscribeFromIndicator",
        symbol,
        indicatorType,
      );
    }
  }

  /**
   * Stop the SignalR connection
   */
  public async stopConnection(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log("🔌 SignalR connection stopped");
      } catch (error) {
        console.warn("Error stopping SignalR connection:", error);
      }
      this.priceUpdateCallbacks.clear();
      this.indicatorUpdateCallbacks.clear();
    }
  }

  /**
   * Get current connection status
   */
  public get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Check if running in fallback mode (no real-time updates)
   */
  public get isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  public onreconnected(callback: () => void): void {
    this.reconnectedCallbacks.add(callback);
  }

  public offreconnected(callback: () => void): void {
    this.reconnectedCallbacks.delete(callback);
  }

  private notifyReconnected(): void {
    this.reconnectedCallbacks.forEach((callback) => callback());
  }

  public onStateChange(
    callback: (state: { isConnected: boolean; error: Error | null }) => void,
  ): void {
    this.stateChangeCallbacks.add(callback);
  }

  public offStateChange(
    callback: (state: { isConnected: boolean; error: Error | null }) => void,
  ): void {
    this.stateChangeCallbacks.delete(callback);
  }

  private notifyStateChange(state: {
    isConnected: boolean;
    error: Error | null;
  }): void {
    this.stateChangeCallbacks.forEach((callback) => callback(state));
  }

  // Constructor removed - state change handling is now done in startConnection()
}

// Create a singleton instance
export const signalRService = new SignalRService();
export default signalRService;

import type { CryptoPrice } from "../types/domain";

interface CoinbaseTickerMessage {
  type: string;
  sequence: number;
  product_id: string;
  price: string;
  open_24h: string;
  volume_24h: string;
  low_24h: string;
  high_24h: string;
  volume_30d: string;
  best_bid: string;
  best_ask: string;
  side: string;
  time: string;
  trade_id: number;
  last_size: string;
}

interface SubscriptionMessage {
  type: "subscribe" | "unsubscribe";
  product_ids: string[];
  channels: string[];
}

/**
 * Service for real-time WebSocket connections to Coinbase Advanced Trade API
 */
class CoinbaseWebSocketService {
  private ws: WebSocket | null = null;
  private readonly reconnectAttempts = 5;
  private reconnectCount = 0;
  private readonly reconnectDelay = 5000; // 5 seconds
  private readonly connectionTimeout = 10000; // 10 seconds
  private reconnectTimer: number | null = null;
  private connectionTimer: number | null = null;
  private isConnecting = false;

  private priceCallbacks = new Map<string, (price: CryptoPrice) => void>();
  private connectionStateCallbacks = new Set<(connected: boolean) => void>();

  // Using production URL for real-time price data
  private readonly wsUrl = "wss://ws-feed.exchange.coinbase.com";
  
  // Fallback URLs in case primary fails
  private readonly fallbackUrls = [
    "wss://ws-feed.pro.coinbase.com",
    "wss://ws-feed-public.sandbox.exchange.coinbase.com"
  ];
  
  // Track consecutive failures to trigger mock mode faster
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3;
  private currentUrlIndex = -1;
  private mockMode = false;
  private mockTimer: number | null = null;

  /**
   * Connect to Coinbase WebSocket feed
   */
  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const url = this.currentUrlIndex >= 0 ? this.fallbackUrls[this.currentUrlIndex] : this.wsUrl;
      console.log(`Attempting to connect to WebSocket: ${url}`);
      this.ws = new WebSocket(url);

      // Set connection timeout
      this.connectionTimer = window.setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.log("WebSocket connection timeout");
          this.ws.close();
          this.handleConnectionFailure();
        }
      }, this.connectionTimeout);

      this.ws.onopen = () => {
        console.log(`✅ Connected to Coinbase WebSocket: ${url}`);
        console.log(`WebSocket readyState: ${this.ws?.readyState}`);
        this.isConnecting = false;
        this.reconnectCount = 0;
        this.consecutiveFailures = 0; // Reset failure counter on successful connection
        this.clearConnectionTimer();
        this.notifyConnectionState(true);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        const errorInfo = this.getCloseCodeInfo(event.code);
        console.log(`❌ Coinbase WebSocket connection closed:`, {
          code: event.code,
          meaning: errorInfo.meaning,
          reason: event.reason || errorInfo.reason,
          wasClean: event.wasClean,
          url: url
        });
        
        // Log additional diagnostic info for code 1006
        if (event.code === 1006) {
          console.warn("🔍 Code 1006 Diagnostics:");
          console.warn("  • This usually indicates network connectivity issues");
          console.warn("  • Corporate firewalls often block WebSocket connections");
          console.warn("  • VPN or proxy settings may interfere");
          console.warn("  • Switching to mock mode for reliable operation");
        }
        
        // Increment consecutive failures counter
        this.consecutiveFailures++;
        console.log(`Consecutive failures: ${this.consecutiveFailures}/${this.maxConsecutiveFailures}`);
        
        this.isConnecting = false;
        this.clearConnectionTimer();
        this.notifyConnectionState(false);

        // Check if we should enable mock mode due to consecutive failures
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          console.warn(`⚠️ Too many consecutive WebSocket failures (${this.consecutiveFailures}). Enabling mock mode.`);
          this.enableMockMode();
          return;
        }

        if (!event.wasClean && this.reconnectCount < this.reconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("Coinbase WebSocket error:", error);
        console.log("WebSocket readyState:", this.ws?.readyState);
        this.clearConnectionTimer();
        this.handleConnectionFailure();
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    this.clearTimers();
    this.disableMockMode();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.priceCallbacks.clear();
    this.reconnectCount = 0;
    this.currentUrlIndex = -1;
    this.isConnecting = false;
    this.mockMode = false;
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.clearConnectionTimer();
    
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private handleConnectionFailure(): void {
    this.consecutiveFailures++;
    console.log(`Connection failure. Consecutive failures: ${this.consecutiveFailures}/${this.maxConsecutiveFailures}`);
    
    this.isConnecting = false;
    this.notifyConnectionState(false);
    
    // Check if we should enable mock mode due to consecutive failures
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      console.warn(`⚠️ Too many consecutive WebSocket failures (${this.consecutiveFailures}). Enabling mock mode.`);
      this.enableMockMode();
      return;
    }
    
    // Try fallback URL if available
    if (this.currentUrlIndex < this.fallbackUrls.length - 1) {
      this.currentUrlIndex++;
      console.log(`🔄 Trying fallback URL: ${this.fallbackUrls[this.currentUrlIndex]}`);
      setTimeout(() => this.connect(), 1000);
    } else if (this.reconnectCount < this.reconnectAttempts) {
      // Reset to primary URL for next reconnection cycle
      this.currentUrlIndex = -1;
      this.scheduleReconnect();
    } else {
      console.error("❌ All WebSocket connection attempts failed - enabling mock mode");
      this.enableMockMode();
    }
  }

  /**
   * Subscribe to ticker updates for a symbol
   */
  public subscribeToTicker(
    symbol: string,
    callback: (price: CryptoPrice) => void,
  ): void {
    if (!symbol.trim()) {
      return;
    }

    // Clear existing subscriptions first
    this.unsubscribeFromAll();

    const productId = this.formatProductId(symbol);
    this.priceCallbacks.set(productId, callback);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription("subscribe", [productId]);
    }
  }

  /**
   * Unsubscribe from ticker updates for a symbol
   */
  public unsubscribeFromTicker(symbol: string): void {
    const productId = this.formatProductId(symbol);
    this.priceCallbacks.delete(productId);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription("unsubscribe", [productId]);
    }
  }

  /**
   * Unsubscribe from all ticker updates
   */
  private unsubscribeFromAll(): void {
    const productIds = Array.from(this.priceCallbacks.keys());
    this.priceCallbacks.clear();

    if (
      productIds.length > 0 &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      this.sendSubscription("unsubscribe", productIds);
    }
  }

  /**
   * Add connection state change callback
   */
  public onConnectionStateChange(callback: (connected: boolean) => void): void {
    this.connectionStateCallbacks.add(callback);
  }

  /**
   * Remove connection state change callback
   */
  public offConnectionStateChange(
    callback: (connected: boolean) => void,
  ): void {
    this.connectionStateCallbacks.delete(callback);
  }

  /**
   * Get current connection status
   */
  public get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || this.mockMode;
  }

  /**
   * Check if running in mock mode
   */
  public get isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Force enable mock mode for testing
   */
  public enableMockModeForTesting(): void {
    console.log("🧪 Forcing mock mode for testing");
    this.disconnect();
    this.enableMockMode();
  }

  private scheduleReconnect(): void {
    this.reconnectCount++;
    console.log(
      `Attempting to reconnect (${this.reconnectCount}/${this.reconnectAttempts}) in ${this.reconnectDelay}ms...`,
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, this.reconnectDelay);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle ticker updates
      if (message.type === "ticker") {
        this.handleTickerUpdate(message as CoinbaseTickerMessage);
      }

      // Handle subscription confirmations
      else if (message.type === "subscriptions") {
        console.log("WebSocket subscription confirmed:", message);
      }

      // Handle errors
      else if (message.type === "error") {
        console.error("WebSocket error message:", message);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  private handleTickerUpdate(ticker: CoinbaseTickerMessage): void {
    const callback = this.priceCallbacks.get(ticker.product_id);
    if (callback) {
      try {
        const price: CryptoPrice = {
          symbol: this.extractSymbol(ticker.product_id),
          price: parseFloat(ticker.price),
          timestamp: ticker.time,
          priceChange24h:
            parseFloat(ticker.price) - parseFloat(ticker.open_24h),
          percentChange24h:
            ((parseFloat(ticker.price) - parseFloat(ticker.open_24h)) /
              parseFloat(ticker.open_24h)) *
            100,
        };

        callback(price);
      } catch (error) {
        console.error("Error processing ticker update:", error);
      }
    }
  }

  private sendSubscription(
    type: "subscribe" | "unsubscribe",
    productIds: string[],
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, cannot send subscription");
      return;
    }

    const message: SubscriptionMessage = {
      type,
      product_ids: productIds,
      channels: ["ticker"],
    };

    console.log(
      `${type === "subscribe" ? "Subscribing to" : "Unsubscribing from"} products:`,
      productIds,
    );
    this.ws.send(JSON.stringify(message));
  }

  private formatProductId(symbol: string): string {
    // Convert symbol to Coinbase product ID format (e.g., "BTC" -> "BTC-USD")
    const cleanSymbol = symbol.trim().toUpperCase();
    return cleanSymbol.includes("-") ? cleanSymbol : `${cleanSymbol}-USD`;
  }

  private extractSymbol(productId: string): string {
    // Extract symbol from product ID (e.g., "BTC-USD" -> "BTC")
    return productId.split("-")[0];
  }

  private notifyConnectionState(connected: boolean): void {
    this.connectionStateCallbacks.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error("Error in connection state callback:", error);
      }
    });
  }

  private getCloseCodeInfo(code: number): { meaning: string; reason: string } {
    switch (code) {
      case 1000:
        return { meaning: "Normal Closure", reason: "Connection closed normally" };
      case 1001:
        return { meaning: "Going Away", reason: "Server is shutting down" };
      case 1002:
        return { meaning: "Protocol Error", reason: "WebSocket protocol error" };
      case 1003:
        return { meaning: "Unsupported Data", reason: "Unsupported data type received" };
      case 1005:
        return { meaning: "No Status Code", reason: "No status code provided" };
      case 1006:
        return { meaning: "Abnormal Closure", reason: "Connection lost unexpectedly (network/firewall issue)" };
      case 1007:
        return { meaning: "Invalid Frame Data", reason: "Invalid UTF-8 data received" };
      case 1008:
        return { meaning: "Policy Violation", reason: "Message violates policy" };
      case 1009:
        return { meaning: "Message Too Big", reason: "Message size exceeds limit" };
      case 1010:
        return { meaning: "Missing Extension", reason: "Required extension not supported" };
      case 1011:
        return { meaning: "Internal Error", reason: "Server encountered unexpected error" };
      case 1015:
        return { meaning: "TLS Handshake", reason: "TLS handshake failure" };
      default:
        return { meaning: "Unknown", reason: `Unknown close code: ${code}` };
    }
  }

  private enableMockMode(): void {
    this.mockMode = true;
    console.log("🤖 WebSocket mock mode enabled - generating simulated price data");
    console.log("ℹ️ Mock mode provides realistic price movements for development/testing");
    this.notifyConnectionState(true); // Simulate connection
    this.startMockData();
  }

  private disableMockMode(): void {
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
    this.mockMode = false;
  }

  private startMockData(): void {
    // Generate mock price updates every 2 seconds
    this.mockTimer = window.setInterval(() => {
      this.priceCallbacks.forEach((callback, productId) => {
        const symbol = this.extractSymbol(productId);
        const basePrice = symbol === "BTC" ? 115000 : symbol === "ETH" ? 3500 : 1000;
        const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
        const price = basePrice * (1 + variation);
        const change24h = basePrice * (Math.random() - 0.5) * 0.05; // ±2.5% daily change
        
        const mockPrice: CryptoPrice = {
          symbol,
          price: parseFloat(price.toFixed(2)),
          timestamp: new Date().toISOString(),
          priceChange24h: parseFloat(change24h.toFixed(2)),
          percentChange24h: parseFloat(((change24h / basePrice) * 100).toFixed(2))
        };

        try {
          callback(mockPrice);
        } catch (error) {
          console.error("Error in mock price callback:", error);
        }
      });
    }, 2000);
  }
}

// Create singleton instance
export const coinbaseWebSocketService = new CoinbaseWebSocketService();
export default coinbaseWebSocketService;

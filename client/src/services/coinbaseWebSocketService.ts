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
  private reconnectTimer: number | null = null;
  private isConnecting = false;

  private priceCallbacks = new Map<string, (price: CryptoPrice) => void>();
  private connectionStateCallbacks = new Set<(connected: boolean) => void>();

  // Using sandbox URL for now - in production this would be wss://ws-feed.exchange.coinbase.com
  private readonly wsUrl = "wss://ws-feed-public.sandbox.exchange.coinbase.com";

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
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log("Connected to Coinbase WebSocket");
        this.isConnecting = false;
        this.reconnectCount = 0;
        this.notifyConnectionState(true);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        console.log("Coinbase WebSocket connection closed:", event);
        this.isConnecting = false;
        this.notifyConnectionState(false);

        if (!event.wasClean && this.reconnectCount < this.reconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("Coinbase WebSocket error:", error);
        this.isConnecting = false;
        this.notifyConnectionState(false);
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.priceCallbacks.clear();
    this.reconnectCount = 0;
    this.isConnecting = false;
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
    return this.ws?.readyState === WebSocket.OPEN;
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
}

// Create singleton instance
export const coinbaseWebSocketService = new CoinbaseWebSocketService();
export default coinbaseWebSocketService;

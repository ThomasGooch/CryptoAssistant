# ADR 0004: Real-time Architecture with SignalR

## Status

Accepted

## Context

AkashTrends requires real-time price updates and indicator calculations for cryptocurrency trading analysis. We needed to decide on a technology and architecture that would support:
- Real-time data streaming to clients
- Efficient periodic updates from external sources
- Scalable subscription model for multiple symbols and indicators
- Reliable error handling and recovery

## Decision

We decided to implement a real-time architecture using:

1. **SignalR for Real-time Communication**
   - Use SignalR hubs for bidirectional communication with clients
   - Implement client subscription model for specific symbols and indicators
   - Broadcast updates to all connected clients

2. **Background Services for Data Collection**
   - Implement `PriceUpdateService` as a hosted background service
   - Run periodic updates (5-second intervals) for subscribed symbols
   - Integrate with external cryptocurrency exchange APIs

3. **Indicator Calculation Pipeline**
   - Create separate `IndicatorUpdateService` for technical analysis
   - Calculate indicators based on historical price data
   - Support multiple indicator types (SMA, EMA, RSI, etc.)

4. **Timeframe Support**
   - Implement multiple timeframe granularities (minute to week)
   - Allow clients to subscribe to specific timeframes
   - Adjust historical data retrieval based on timeframe

## Consequences

### Positive

- Real-time updates provide immediate market insights
- Separation of price updates and indicator calculations improves maintainability
- Subscription model allows clients to receive only relevant data
- Multiple timeframe support enables comprehensive analysis

### Negative

- Increased complexity in managing background services
- Potential performance challenges with many subscriptions
- Need for careful error handling to prevent service disruptions
- More complex testing requirements

## Implementation Details

- `PriceUpdateService`: Background service for periodic price updates
- `IndicatorUpdateService`: Service for calculating technical indicators
- `PriceUpdateHub`: SignalR hub for real-time communication
- `Timeframe` enum: Defines supported time granularities
- Subscription management for both prices and indicators

## Compliance Verification

The real-time architecture adheres to our clean architecture and SOLID principles:
- Services depend on abstractions, not concrete implementations
- Clear separation of concerns between price updates and indicator calculations
- Testable components with proper dependency injection

# AkashTrends - Real-Time Crypto Trading Analysis Platform

## Overview

AkashTrends is a sophisticated cryptocurrency trading analysis platform that helps traders make informed decisions through real-time market data analysis and technical indicators. Built with a clean architecture approach and following SOLID principles, this MVP delivers essential trading analysis tools with a focus on reliability and performance.

### Why AkashTrends?

- **Real-Time Analysis**: Get instant access to live cryptocurrency price data from Coinbase
- **Technical Indicators**: Make decisions based on proven technical analysis tools
- **Clean Architecture**: Built with maintainability and testability in mind
- **Modern Tech Stack**: Leverages the latest .NET 9 features and React with TypeScript

## MVP Implementation Status

### Core Features
- **Real-time Price Monitoring**
  - Background service for periodic price updates
  - SignalR integration for real-time broadcasting
  - Symbol subscription management
  - Error handling and logging
  - Coinbase API integration

- **Technical Analysis Indicators**
  - Simple Moving Average (SMA)
  - Exponential Moving Average (EMA)
  - Relative Strength Index (RSI)
  - Bollinger Bands
  - Stochastic Oscillator
  - Factory pattern for indicator creation
  - Strong input validation and error handling

- **Historical Data Analysis**
  - Historical price retrieval
  - Indicator calculation on historical data
  - Data validation and processing

- **Multiple Timeframe Support**
  - Various timeframes from minute to week
  - Timeframe-specific calculations
  - Proper time range management

- **Testing & Quality Assurance**
  - Comprehensive test coverage across all layers
  - TDD approach consistently applied
  - Mock-based testing with NSubstitute

### Development Approach
- **Test-Driven Development (TDD)**
  - Write tests first, then implement features
  - Ensure all code is covered by tests
  - Refactor with confidence
  - Using xUnit for test framework
  - NSubstitute for mocking dependencies
  - Tests organized by feature and layer

- **SOLID Principles**
  - **S**ingle Responsibility: Each class has one job
  - **O**pen/Closed: Open for extension, closed for modification
  - **L**iskov Substitution: Proper use of interfaces and inheritance
  - **I**nterface Segregation: Focused interfaces with specific purposes
  - **D**ependency Inversion: High-level modules depend on abstractions

- **Clean Architecture**
  - Clear separation of concerns
  - Domain-centric approach
  - Independence from frameworks and external concerns
  - Testability at all layers
  - Proper use of interfaces for dependency inversion

### Current Status
- **API Layer**: 
  - REST endpoints for price and indicators implemented
  - Clean controller design with dependency injection
  - Minor async optimization needed

- **Infrastructure**:
  - External API integration complete
  - Dependency injection configuration in place
  - Service implementations functional

- **Core Domain**:
  - CryptoPrice: Immutable value object with validation
  - Technical Indicators: All major indicators implemented
  - IIndicator interface with Calculate method
  - Factory pattern for indicator creation

- **Testing**:
  - All tests passing
  - Coverage across all layers
  - Minor test warning to fix

### Roadmap
- **Short-term Priorities**
  - Complete API documentation with Swagger/OpenAPI
  - Implement caching for historical prices and indicator results
  - Improve error resilience with retry policies and circuit breakers

- **Medium-term Goals**
  - Add persistence layer for historical data and user preferences
  - Parallelize indicator calculations for performance
  - Create React/TypeScript frontend with charts and indicators

- **Long-term Vision**
  - Support for multiple cryptocurrency exchanges
  - Machine learning for pattern recognition
  - User customization for indicators and strategies

## Technology Stack

### Backend (Implemented)
- **.NET 9**: Latest features and performance improvements
- **C#**: Primary programming language
- **Clean Architecture**: Separation of concerns and maintainability
- **xUnit & NSubstitute**: Comprehensive test coverage
- **Swagger/OpenAPI**: API documentation and testing
- **SignalR**: Real-time updates

### Frontend (Planned)
- **React**: Modern UI framework
- **TypeScript**: Type-safe development
- **Material-UI**: Clean, professional design
- **React Query**: Efficient data fetching
- **React Testing Library**: Component testing

## Project Structure

```
AkashTrends/
├── src/
│   ├── AkashTrends.API/           # Web API and controllers
│   │   ├── Controllers/           # API endpoints
│   │   ├── Hubs/                  # SignalR hubs
│   │   ├── Services/              # Background services
│   │   └── Models/                # API request/response models
│   ├── AkashTrends.Application/   # Application services
│   ├── AkashTrends.Core/          # Domain layer
│   │   ├── Analysis/              # Technical indicators
│   │   │   ├── Indicators/        # Indicator implementations
│   │   │   └── Timeframe.cs       # Timeframe definitions
│   │   ├── Domain/                # Domain entities
│   │   └── Services/              # Core service interfaces
│   └── AkashTrends.Infrastructure/ # External integrations
│       ├── ExternalApis/          # External API clients
│       └── Services/              # Service implementations
└── tests/
    ├── AkashTrends.API.Tests/     # API integration tests
    ├── AkashTrends.Core.Tests/    # Core unit tests
    └── AkashTrends.Infrastructure.Tests/ # Infrastructure tests
```

## Getting Started

### Prerequisites
- .NET 9 SDK
- Coinbase API credentials
- Node.js and npm (for frontend)

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/AkashTrends.git
   cd AkashTrends
   ```

2. Install dependencies:
   ```bash
   dotnet restore
   ```

3. Configure Coinbase API:
   - Copy `appsettings.example.json` to `appsettings.json`
   - Add your Coinbase API credentials

4. Run the application:
   ```bash
   dotnet run --project src/AkashTrends.API
   ```

5. Access the API:
   - Swagger UI: `https://localhost:5001/swagger`
   - API Base URL: `https://localhost:5001/api`

## Development

### Running Tests
```bash
dotnet test
```

### API Endpoints
- `GET /api/crypto/price/{symbol}` - Get current price
- `GET /api/crypto/indicator/{symbol}` - Calculate technical indicator
- `GET /api/crypto/indicators` - List available indicators

### SignalR Endpoints
- `hub/priceupdate` - Real-time price and indicator updates
  - `SubscribeToSymbol(symbol)` - Subscribe to price updates
  - `SubscribeToIndicator(symbol, indicatorType, period)` - Subscribe to indicator
  - `SubscribeToIndicator(symbol, indicatorType, period, timeframe)` - Subscribe with timeframe

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

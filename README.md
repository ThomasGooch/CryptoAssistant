# AkashTrends - Crypto Trading Analysis Platform

## Overview

AkashTrends is a sophisticated cryptocurrency trading analysis platform that helps traders make informed decisions through real-time market data analysis and technical indicators.

### Why AkashTrends?

- **Real-Time Analysis**: Get instant access to live cryptocurrency price data from Coinbase
- **Technical Indicators**: Make decisions based on proven technical analysis tools
- **Clean Architecture**: Built with maintainability and testability in mind
- **Modern Tech Stack**: Leverages the latest .NET 9 features and React with TypeScript

## Features

### Technical Indicators
- Simple Moving Average (SMA)
- Exponential Moving Average (EMA)
- Relative Strength Index (RSI)
- Bollinger Bands
- Stochastic Oscillator

### Core Capabilities
- Real-time price monitoring via Coinbase API
- Historical price analysis
- Multiple timeframe support
- Clean, modern REST API
- Swagger documentation

## Technology Stack

### Backend
- **.NET 9**: Latest features and performance improvements
- **Clean Architecture**: Separation of concerns and maintainability
- **xUnit & NSubstitute**: Comprehensive test coverage
- **Swagger/OpenAPI**: API documentation and testing
- **SignalR**: Real-time updates

### Frontend (Coming Soon)
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
│   │   └── Models/               # API request/response models
│   ├── AkashTrends.Core/         # Domain layer
│   │   ├── Analysis/            # Technical indicators
│   │   ├── Domain/             # Domain entities
│   │   └── Services/           # Core services
│   └── AkashTrends.Infrastructure/ # External integrations
└── tests/
    ├── AkashTrends.API.Tests/     # API integration tests
    └── AkashTrends.Core.Tests/    # Unit tests
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

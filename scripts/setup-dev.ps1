# Development setup script for AkashTrends
# This script sets up the development environment for both frontend and backend

Write-Host "Setting up AkashTrends development environment..." -ForegroundColor Cyan

# Setup frontend dependencies
Write-Host "Setting up frontend dependencies..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot/../client"
npm install

# Setup backend dependencies
Write-Host "Setting up backend dependencies..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot/.."
dotnet restore

Write-Host "Development environment setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the backend:" -ForegroundColor Cyan
Write-Host "  cd src/AkashTrends.API" -ForegroundColor White
Write-Host "  dotnet run" -ForegroundColor White
Write-Host ""
Write-Host "To start the frontend development server:" -ForegroundColor Cyan
Write-Host "  cd client" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White

# Build script for AkashTrends
# This script builds both the frontend and backend components

Write-Host "Building AkashTrends..." -ForegroundColor Cyan

# Build the frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot/../client"
npm run build

# Copy the built frontend to the .NET project's wwwroot folder
Write-Host "Copying frontend build to API project..." -ForegroundColor Yellow
$sourcePath = "$PSScriptRoot/../client/dist/*"
$destinationPath = "$PSScriptRoot/../src/AkashTrends.API/wwwroot"

# Create wwwroot directory if it doesn't exist
if (-not (Test-Path -Path $destinationPath)) {
    New-Item -ItemType Directory -Path $destinationPath | Out-Null
    Write-Host "Created wwwroot directory" -ForegroundColor Green
}

Copy-Item -Path $sourcePath -Destination $destinationPath -Recurse -Force
Write-Host "Frontend build copied to wwwroot" -ForegroundColor Green

# Build the .NET solution
Write-Host "Building .NET solution..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot/.."
dotnet build

Write-Host "Build completed successfully!" -ForegroundColor Green

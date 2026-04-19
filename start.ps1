#!/usr/bin/env pwsh
# StayBnB One-Click Startup Script
# Opens Server and Client in new windows

Write-Host "`n🚀 StayBnB - Starting Development Environment" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✓ Node.js $nodeVersion found`n" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/`n" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Get the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommandPath
Set-Location $scriptDir

Write-Host "→ Starting services...`n"

# Start Server in new window
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Start-Process -WindowStyle Normal -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd server; npm run dev"

# Wait for server to start
Start-Sleep -Seconds 3

# Start Client in new window
Write-Host "Starting Frontend Client..." -ForegroundColor Cyan
Start-Process -WindowStyle Normal -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

# Wait for client to start
Start-Sleep -Seconds 3

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "✓ Services are starting!`n" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173/" -ForegroundColor Yellow
Write-Host "🔌 Backend:  http://localhost:5000/api/v1" -ForegroundColor Yellow
Write-Host "💊 Health:   http://localhost:5000/health`n" -ForegroundColor Yellow
Write-Host "Windows have opened for:" -ForegroundColor Green
Write-Host "  • Server (Backend)" -ForegroundColor Green
Write-Host "  • Client (Frontend)`n" -ForegroundColor Green

Read-Host "Press Enter to open the application in your browser"

# Open browser
Start-Process "http://localhost:5173/"

Write-Host "Browser opened!`n" -ForegroundColor Green
Write-Host "To stop the servers:" -ForegroundColor Yellow
Write-Host "  • Close the Server window (type 'exit' or press Ctrl+C)" -ForegroundColor Yellow
Write-Host "  • Close the Client window (type 'exit' or press Ctrl+C)`n" -ForegroundColor Yellow

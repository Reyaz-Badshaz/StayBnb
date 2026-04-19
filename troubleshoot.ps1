# StayBnB - Troubleshooting & Quick Start Script
# This script handles environment setup and restarts servers

Clear-Host
Write-Host "`n🚀 StayBnB - Troubleshooting Script" -ForegroundColor Green
Write-Host "===================================`n" -ForegroundColor Green

# Kill any existing processes on ports 5000 and 5173
Write-Host "→ Checking for existing processes..." -ForegroundColor Cyan

$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "  Stopping process on port 5000..." -ForegroundColor Yellow
    $port5000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

if ($port5173) {
    Write-Host "  Stopping process on port 5173..." -ForegroundColor Yellow
    $port5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
}

Write-Host "✓ Ports cleared`n" -ForegroundColor Green

# Fix .env file
Write-Host "→ Updating server configuration..." -ForegroundColor Cyan
$envPath = ".\server\.env"
if (Test-Path $envPath) {
    $content = Get-Content $envPath
    $content = $content -replace "CLIENT_URL=http://localhost:\d+", "CLIENT_URL=http://localhost:5173"
    Set-Content -Path $envPath -Value $content
    Write-Host "✓ Server .env updated (CLIENT_URL=http://localhost:5173)`n" -ForegroundColor Green
}

# Start servers in new windows
Write-Host "→ Starting development servers...`n" -ForegroundColor Cyan

Write-Host "  Starting Backend (port 5000)..." -ForegroundColor Yellow
Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "Set-Location '$(Get-Location)'; cd server; npm run dev"

Start-Sleep -Seconds 3

Write-Host "  Starting Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", "Set-Location '$(Get-Location)'; cd client; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`n✓ Servers are starting!" -ForegroundColor Green
Write-Host "`n📋 Open your browser and try:" -ForegroundColor Cyan
Write-Host "   http://localhost:5173/" -ForegroundColor Yellow
Write-Host "`n🔐 Test Login Credentials:" -ForegroundColor Cyan
Write-Host "   Email: sarah@staybnb.com" -ForegroundColor Yellow
Write-Host "   Password: Password123!" -ForegroundColor Yellow

Write-Host "`n" -ForegroundColor Green

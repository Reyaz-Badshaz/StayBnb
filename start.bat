@echo off
REM StayBnB One-Click Startup Script
REM Opens Server and Client in separate windows

cls
echo.
echo ?? StayBnB - Starting Development Environment
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ? Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo ? Node.js found
echo.
echo ? Starting services...
echo.

REM Start Server in new window
echo Starting Backend Server...
start "StayBnB Server" cmd /k "cd server && npm run dev"

REM Wait a bit for server to start
timeout /t 3 /nobreak

REM Start Client in new window
echo Starting Frontend Client...
start "StayBnB Client" cmd /k "cd client && npm run dev"

REM Wait for client to start
timeout /t 3 /nobreak

echo.
echo ================================================
echo ? Services are starting!
echo.
echo ?? Frontend: http://localhost:5173/
echo ?? Backend:  http://localhost:5000/api/v1
echo ?? Health:   http://localhost:5000/health
echo.
echo Windows have opened for:
echo   ? Server (Backend)
echo   ? Client (Frontend)
echo.
echo Press Enter to open the application in your browser...
pause

REM Open browser
start http://localhost:5173/

echo Browser opened!
echo.
echo To stop the servers:
echo   ? Close the Server window (type 'exit' or press Ctrl+C)
echo   ? Close the Client window (type 'exit' or press Ctrl+C)
echo.

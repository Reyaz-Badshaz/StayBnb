@echo off
REM StayBnB Setup - Install Dependencies and Seed Database

cls
echo.
echo ?? StayBnB - Complete Setup
echo ================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ? Node.js is not installed
    pause
    exit /b 1
)

REM Get script location
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo ? Node.js found
echo.

REM Install dependencies
echo ? Installing dependencies...
call npm install >nul 2>&1

cd server
call npm install >nul 2>&1
echo ? Dependencies installed

REM Seed database
echo.
echo ? Seeding database with sample data...
echo.
call node src/scripts/seedData.js

echo.
echo ================================================
echo ? Setup Complete!
echo.
echo Next: Run start.bat to start the servers
echo.

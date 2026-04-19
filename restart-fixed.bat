@echo off
REM StayBnB - Restart After Bug Fix

cls
echo.
echo ?? StayBnB - Restarting Servers (Bug Fix Applied)
echo ================================================
echo.

echo ? Changes made:
echo   - Fixed properties not showing issue
echo   - Fixed unexpected logout issue
echo.

echo ? Restarting servers...
echo.

echo Starting Backend (Port 5000)...
start "StayBnB Server - FIXED" cmd /k "cd server && npm run dev"

timeout /t 4 /nobreak

echo Starting Frontend (Port 5173)...
start "StayBnB Client" cmd /k "cd client && npm run dev"

timeout /t 4 /nobreak

echo.
echo ? Servers restarted!
echo.
echo ?? Frontend: http://localhost:5173/
echo ?? Backend:  http://localhost:5000/api/v1
echo.
echo ?? Test it now:
echo    1. Login with: sarah@staybnb.com / Password123!
echo    2. Go to Host Dashboard
echo    3. Create a new property listing
echo    4. Property should appear immediately (no logout)
echo.
echo ?? See PROPERTY_BUG_FIX.md for details
echo.

start http://localhost:5173/

timeout /t 2
echo Browser opened!
pause

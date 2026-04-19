@echo off
REM StayBnB - Restart After CSP Fix

cls
echo.
echo ? IMAGE LOADING FIX APPLIED
echo ================================
echo.

echo Problem Found:
echo   - CSP (Content Security Policy) was blocking Unsplash images
echo   - Only allowed Cloudinary images
echo.

echo Solution Applied:
echo   - Added https://images.unsplash.com to CSP imgSrc
echo   - Added https://*.unsplash.com wildcard
echo.

echo ? Restarting server and client...
echo.

echo Starting Backend...
start "StayBnB Server - CSP Fixed" cmd /k "cd server && npm run dev"

timeout /t 4 /nobreak

echo Starting Frontend...
start "StayBnB Client" cmd /k "cd client && npm run dev"

timeout /t 4 /nobreak

echo.
echo ? Servers restarted!
echo.
echo ?? Open: http://localhost:5173/
echo.
echo ?? Images should now load correctly!
echo.

start http://localhost:5173/

timeout /t 2
echo Browser opened!
pause

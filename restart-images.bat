@echo off
REM StayBnB - Restart Client After Image Fix

cls
echo.
echo ???  StayBnB - Image Loading Fix
echo ===================================
echo.

echo ? Changes made:
echo   - Added error handling to PropertyCard
echo   - Added image load/error handlers
echo   - Added fallback message for failed images
echo   - Added console logging for debugging
echo.

echo ? Restarting client...
echo.

start "StayBnB Client - Image Fix" cmd /k "cd client && npm run dev"

timeout /t 4 /nobreak

echo.
echo ? Client restarted!
echo.
echo ?? Frontend: http://localhost:5173/
echo.
echo ?? To debug:
echo    1. Open http://localhost:5173/
echo    2. Press F12 to open DevTools
echo    3. Go to Console tab
echo    4. Look for image errors
echo.
echo ?? See IMAGE_LOADING_DEBUG.md for details
echo.

start http://localhost:5173/

timeout /t 2
echo Browser opened!
pause

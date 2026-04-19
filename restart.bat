@echo off
REM StayBnB - Fix and Restart

cls
echo.
echo ?? StayBnB - Server Restart
echo ================================
echo.

echo ? Servers will start in new windows
echo.

echo Starting Backend (Port 5000)...
start "StayBnB Server" cmd /k "cd server && npm run dev"

timeout /t 4 /nobreak

echo Starting Frontend (Port 5173)...
start "StayBnB Client" cmd /k "cd client && npm run dev"

timeout /t 4 /nobreak

echo.
echo ? Servers started!
echo.
echo ?? Frontend: http://localhost:5173/
echo ?? Backend:  http://localhost:5000/api/v1
echo.
echo ?? Test Login:
echo    Email: sarah@staybnb.com
echo    Password: Password123!
echo.

start http://localhost:5173/

echo Browser opened!
pause

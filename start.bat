@echo off
setlocal enabledelayedexpansion

echo Starting Wind Simulator...
echo.

REM Start Backend
echo [1/2] Starting Backend (FastAPI on port 8000)...
start "Wind Simulator Backend" cmd /k "cd /d %~dp0backend && python main.py"
timeout /t 3 /nobreak

REM Start Frontend
echo [2/2] Starting Frontend (Vite on port 5173)...
start "Wind Simulator Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo Wind Simulator is starting!
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo ============================================
echo.
echo Waiting for servers to start (this may take 10-15 seconds)...
timeout /t 5 /nobreak
echo.
echo Opening browser...
start http://localhost:5173
echo.
echo Close these command windows to stop the servers.

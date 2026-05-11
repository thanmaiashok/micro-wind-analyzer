@echo off
echo Stopping Wind Simulator...
echo.

REM Kill Node.js processes (Frontend)
echo [1/2] Stopping Frontend (npm)...
taskkill /IM node.exe /F /T 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Frontend stopped successfully.
) else (
    echo Frontend was not running.
)

REM Kill Python processes (Backend)
echo [2/2] Stopping Backend (Python)...
taskkill /IM python.exe /F /T 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Backend stopped successfully.
) else (
    echo Backend was not running.
)

echo.
echo All processes stopped.
pause

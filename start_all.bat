@echo off
title E-Mobility Complete System Starter
color 0B

echo ========================================================
echo   E-MOBILITY SYSTEM - STARTING ALL SERVICES
echo ========================================================
echo.

REM 1. Check and Start PostgreSQL Database
echo [1/4] Checking PostgreSQL Database on Port 5432...
netstat -ano | findstr :5432 >nul
if %errorlevel% equ 0 (
    echo    [OK] PostgreSQL is already running.
) else (
    echo    [STARTING] Launching PostgreSQL server...
    if exist "D:\postsql\bin\postgres.exe" (
        start "E-Mobility - PostgreSQL" /min "D:\postsql\bin\postgres.exe" -D "D:\postsql\data"
        timeout /t 3 /nobreak >nul
        echo    [OK] PostgreSQL started successfully.
    ) else (
        echo    [WARNING] PostgreSQL path not found at D:\postsql\bin\postgres.exe
        echo    Please ensure your PostgreSQL Windows service is running.
    )
)
echo.

REM 2. Start Backend API Server
echo [2/4] Starting Backend Node.js Server (Port 5000)...
start "E-Mobility - Backend API (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 2 /nobreak >nul
echo.

REM 3. Start AI CCTV & ANPR Engine
echo [3/4] Starting AI CCTV & ANPR Engine (Port 8000)...
start "E-Mobility - AI Vision Server (Port 8000)" cmd /k "cd /d %~dp0 && python ai_traffic_server.py"
timeout /t 3 /nobreak >nul
echo.

REM 4. Start Admin Frontend Dashboard
echo [4/4] Starting Admin Frontend Dashboard (Port 5173)...
start "E-Mobility - Admin Frontend (Port 5173)" cmd /k "cd /d %~dp0e-mobility-admin && npm run dev"
echo.

echo ========================================================
echo   ALL E-MOBILITY SERVICES HAVE BEEN LAUNCHED!
echo ========================================================
echo.
echo   * Backend API:      http://localhost:5000
echo   * AI CCTV Server:   http://localhost:8000
echo   * Admin Dashboard:  http://localhost:5173
echo.
echo   Keep the opened terminal windows running in background.
echo ========================================================
pause

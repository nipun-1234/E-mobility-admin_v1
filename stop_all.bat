@echo off
title E-Mobility Stop All Services
color 0C

echo ========================================================
echo   E-MOBILITY SYSTEM - STOPPING ALL SERVICES
echo ========================================================
echo.

echo Stopping Node.js processes (Backend & Frontend)...
taskkill /f /im node.exe >nul 2>&1

echo Stopping Python AI Vision Engine...
taskkill /f /im python.exe >nul 2>&1

echo Stopping PostgreSQL process...
taskkill /f /im postgres.exe >nul 2>&1

echo.
echo [OK] All E-Mobility services have been stopped.
echo ========================================================
pause

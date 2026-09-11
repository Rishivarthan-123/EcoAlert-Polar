@echo off
title EcoAlert Polar - Server
cd /d "%~dp0"
echo.
echo  [EcoAlert Polar] Starting AI Energy Command Center...
echo.
backend\.venv\Scripts\python.exe start_server.py
pause

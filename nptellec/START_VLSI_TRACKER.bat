@echo off
setlocal
cd /d "%~dp0"
echo.
echo   RTL to GDS - NPTEL Study Tracker
 echo   --------------------------------
 echo   Keep this window open while watching lessons.
 echo   Press Ctrl+C when finished.
 echo.
set "PY_CMD="
where py >nul 2>&1
if not errorlevel 1 set "PY_CMD=py -3"
if defined PY_CMD goto START
where python >nul 2>&1
if not errorlevel 1 set "PY_CMD=python"
if defined PY_CMD goto START
where python3 >nul 2>&1
if not errorlevel 1 set "PY_CMD=python3"
if defined PY_CMD goto START
echo Python 3 was not found. Install it, then run this launcher again.
echo https://www.python.org/downloads/
pause
exit /b 1
:START
rem Start the browser shortly AFTER the local server starts listening.
start "" /min powershell -NoProfile -Command "Start-Sleep -Milliseconds 1600; Start-Process 'http://127.0.0.1:8765/VLSI_RTL_to_GDS_Study_Tracker.html'"
%PY_CMD% -m http.server 8765 --bind 127.0.0.1
if errorlevel 1 (
 echo.
 echo Could not start the server. Port 8765 may already be in use.
 echo If the page opened anyway, an existing server may be running.
 pause
)

@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 18 or newer, then run this again.
  pause
  exit /b 1
)
echo Starting BG3 Local Save Editor...
echo.
echo Open http://localhost:8081 in a browser.
echo Keep this window open while using the editor.
echo.
npm start
pause

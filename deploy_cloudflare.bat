@echo off
setlocal enabledelayedexpansion
title CompTIA A+ Master - Cloudflare Pages Deployment

:menu
cls
echo =====================================================================
echo   CompTIA A+ Master - Cloudflare Pages Deployment
echo =====================================================================
echo.
echo   [1] Build web dist and deploy to Cloudflare Pages
echo   [2] Build web dist only (no deploy)
echo   [3] Launch Cloudflare Quick Tunnel from dist_web (temporary link)
echo   [4] Serve dist_web locally for testing (http://localhost:8787)
echo   [5] Validate Question Bank Integrity
echo   [6] Exit
echo.
set /p choice="Select an option (1-6): "

if "%choice%"=="1" goto build_and_deploy
if "%choice%"=="2" goto build_only
if "%choice%"=="3" goto quick_tunnel
if "%choice%"=="4" goto local_server
if "%choice%"=="5" goto validate_bank
if "%choice%"=="6" goto exit_hub
goto menu

:build_only
cls
echo =====================================================================
echo   Building dist_web
echo =====================================================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found in PATH. Install Python 3 to build dist_web.
  pause
  goto menu
)
python tools\build_web_dist.py
echo.
pause
goto menu

:build_and_deploy
cls
echo =====================================================================
echo   Build and Deploy to Cloudflare Pages
echo =====================================================================
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found in PATH. Install Python 3 to build dist_web.
  pause
  goto menu
)

if exist "tools\release_gate.py" (
  echo Running release gate...
  python tools\release_gate.py
  if errorlevel 1 (
    echo [ERROR] Release gate failed. See the messages above. Deployment aborted.
    pause
    goto menu
  )
  echo.
) else (
  echo [NOTE] tools\release_gate.py not found - skipping release gate.
  echo.
)

python tools\build_web_dist.py
if errorlevel 1 (
  echo [ERROR] Build failed. See the messages above. Deployment aborted.
  pause
  goto menu
)

echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH. Install Node.js from https://nodejs.org/
  pause
  goto menu
)

echo Running dist_web tests...
node tools\test_web_dist.js
if errorlevel 1 (
  echo [ERROR] dist_web tests failed. See the messages above. Deployment aborted.
  pause
  goto menu
)

echo.
where npx >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js / npx was not found in PATH.
  echo Install Node.js from https://nodejs.org/ then run:
  echo     npm i -g wrangler
  pause
  goto menu
)

npx wrangler --version >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Wrangler is not installed.
  echo Run:  npm i -g wrangler
  echo Then log in once with:  npx wrangler login
  pause
  goto menu
)

npx wrangler whoami >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Wrangler is not logged in.
  echo Run:  npx wrangler login
  echo This opens a browser window to log in to your free Cloudflare account
  echo (no credit card or domain needed). Then run this option again.
  pause
  goto menu
)

echo.
echo Deploying dist_web to Cloudflare Pages project: comptia-a-plus-master
echo.
call npx wrangler pages deploy dist_web --project-name comptia-a-plus-master
if errorlevel 1 (
  echo [ERROR] wrangler pages deploy failed. See the messages above.
  pause
  goto menu
)
echo.
echo Deployment succeeded. Your permanent URL is now live.
pause
goto menu

:quick_tunnel
cls
echo =====================================================================
echo   Cloudflare Quick Tunnel (dist_web, temporary link)
echo =====================================================================
echo.
if not exist "dist_web\index.html" (
  echo dist_web is missing or incomplete. Building it now...
  python tools\build_web_dist.py
)
echo Starting local web server on port 8787 in the background...
start "CompTIA Local Server" powershell -Command "cd dist_web; python -m http.server 8787"
timeout /t 2 >nul

echo Starting Cloudflare tunnel...
echo (Watch the output below for the 'https://*.trycloudflare.com' URL)
echo.
call npx cloudflared tunnel --url http://localhost:8787
pause
goto menu

:local_server
cls
echo =====================================================================
echo   Local Test Server (dist_web)
echo =====================================================================
echo.
if not exist "dist_web\index.html" (
  echo dist_web is missing or incomplete. Building it now...
  python tools\build_web_dist.py
)
echo Starting HTTP server on http://localhost:8787 ...
echo Press Ctrl+C in the server window to stop.
echo.
start "" http://localhost:8787
cd dist_web
python -m http.server 8787
cd ..
pause
goto menu

:validate_bank
cls
echo =====================================================================
echo   Validating Question Bank Integrity
echo =====================================================================
echo.
python tools\validate_bank.py
echo.
pause
goto menu

:exit_hub
cls
echo Exiting deployment hub.
exit /b 0

@echo off
setlocal enabledelayedexpansion
title Clariora - Cloudflare Deploy (non-interactive)

REM Loads .env automatically via tools\deploy_cloudflare.py
REM Preferred: Workers assets. Fallback: Pages.

cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python not found in PATH.
  exit /b 1
)

python tools\deploy_cloudflare.py %*
exit /b %ERRORLEVEL%

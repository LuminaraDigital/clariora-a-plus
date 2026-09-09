@echo off
title Clariora - Cloudflare Tunnel
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_cloudflare_tunnel.ps1"
exit /b %ERRORLEVEL%

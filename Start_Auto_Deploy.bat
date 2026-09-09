@echo off
title Clariora - auto deploy to Cloudflare
cd /d "%~dp0"
echo Watching this folder. Every saved change is built, tested and deployed to Cloudflare.
echo Close this window to stop. Log: release\deploy.log
python tools\autodeploy.py
pause

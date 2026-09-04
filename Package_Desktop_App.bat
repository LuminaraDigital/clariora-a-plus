@echo off
title CompTIA A+ Desktop Installer Build
echo =====================================================================
echo  Building signed Windows NSIS installer (production ship path)
echo =====================================================================
echo.
echo [1/4] Release gate
python "%~dp0tools\release_gate.py"
if errorlevel 1 goto :gatefail
echo.
echo [2/4] Question bank build
python "%~dp0tools\build_bank.py"
if errorlevel 1 goto :fail
echo.
echo [3/4] Question bank validation
python "%~dp0tools\validate_bank.py"
if errorlevel 1 goto :fail
echo.
echo [4/4] Installer build
python "%~dp0tools\build_windows_installer.py" --portable
if errorlevel 1 goto :fail
echo.
echo Canonical installer: %~dp0release\
echo Next: node tools\smoke_electron.js
goto :eof
:gatefail
echo.
echo RELEASE GATE FAILED. Nothing was built.
echo Fix every FAIL row above, then run this again.
exit /b 1
:fail
echo BUILD FAILED
exit /b 1

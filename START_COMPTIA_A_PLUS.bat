@echo off
title Clariora
setlocal enabledelayedexpansion

echo ===============================================================================
echo   Clariora
echo   Core 1 (220-1201) and Core 2 (220-1202)
echo ===============================================================================
echo.

:: Local data folder used by the portable build for its learner database.
if not exist "%~dp0data" mkdir "%~dp0data" >nul 2>&1

:: 1. Portable build (no install, no dependencies)
if exist "%~dp0release\portable\Clariora.exe" (
    echo Starting the portable app...
    start "" "%~dp0release\portable\Clariora.exe"
    goto :done
)

:: 2. Single-file portable executable
for %%F in ("%~dp0release\Clariora_Portable_*.exe") do (
    echo Starting the portable app...
    start "" "%%~fF"
    goto :done
)

:: 3. Installed copy from the setup program
if exist "%LOCALAPPDATA%\Programs\Clariora\Clariora.exe" (
    echo Starting the installed app...
    start "" "%LOCALAPPDATA%\Programs\Clariora\Clariora.exe"
    goto :done
)

:: 4. Installer present but not yet run
for %%F in ("%~dp0release\Clariora_Setup_*.exe") do (
    echo The app is not installed yet. Running the setup program...
    start "" "%%~fF"
    goto :done
)

:: 5. Browser fallback. Works offline, stores progress in the browser.
echo No desktop build found. Opening the browser version...
if exist "%~dp0index.html" (
    start "" "%~dp0index.html"
) else (
    start "" "%~dp0A_Plus_Exam_Simulator.html"
)

:done
echo.
echo The simulator is starting. You can close this window.
timeout /t 3 >nul
exit /b 0

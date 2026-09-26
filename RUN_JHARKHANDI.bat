@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Jharkhandi Local Server
set "PORT=5855"
set "URL=http://localhost:%PORT%"
set "HEALTH=%URL%/api/health"
set "LOG=%~dp0logs\server.log"

if not exist "%~dp0logs" mkdir "%~dp0logs" >nul 2>&1
>"%LOG%" echo [%date% %time%] Jharkhandi launcher starting

echo ====================================================
echo              Jharkhandi - Local Launch
echo ====================================================
echo.
echo Port: %PORT%
echo Folder: %CD%
echo.

rem If Jharkhandi is already healthy, simply open it.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%HEALTH%' -TimeoutSec 2; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
  echo Jharkhandi is already running.
  start "" "%URL%"
  exit /b 0
)

set "RUNTIME="
set "RUNTIME_CMD="

where node >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%V in ('node -p "process.versions.node" 2^>nul') do set "NODE_VERSION=%%V"
  for /f "delims=" %%M in ('node -p "Number(process.versions.node.split('.')[0])" 2^>nul') do set "NODE_MAJOR=%%M"
  if defined NODE_MAJOR if !NODE_MAJOR! GEQ 18 (
    set "RUNTIME=Node.js !NODE_VERSION!"
    set "RUNTIME_CMD=node server.mjs"
  )
)

if not defined RUNTIME_CMD (
  where python >nul 2>&1
  if not errorlevel 1 (
    for /f "delims=" %%V in ('python --version 2^>^&1') do set "PY_VERSION=%%V"
    set "RUNTIME=!PY_VERSION! fallback"
    set "RUNTIME_CMD=python server_fallback.py"
  )
)

if not defined RUNTIME_CMD (
  where py >nul 2>&1
  if not errorlevel 1 (
    py -3 --version >nul 2>&1
    if not errorlevel 1 (
      for /f "delims=" %%V in ('py -3 --version 2^>^&1') do set "PY_VERSION=%%V"
      set "RUNTIME=!PY_VERSION! fallback"
      set "RUNTIME_CMD=py -3 server_fallback.py"
    )
  )
)

if not defined RUNTIME_CMD goto :NO_RUNTIME

echo Runtime: !RUNTIME!
echo Starting server. The browser will open only after the server is ready...
echo.
>>"%LOG%" echo Runtime: !RUNTIME!

rem Start a hidden health waiter. It opens Chrome/default browser only when the API is live.
start "Jharkhandi readiness" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wait-and-open.ps1" -Port %PORT% -LogPath "%LOG%"

rem Keep the actual server in this window. If it fails, the error stays visible.
call !RUNTIME_CMD! >>"%LOG%" 2>&1
set "EXIT_CODE=!ERRORLEVEL!"

echo.
echo ====================================================
echo Jharkhandi server stopped or failed to start.
echo Exit code: !EXIT_CODE!
echo ====================================================
echo.
echo Last server messages:
powershell -NoProfile -ExecutionPolicy Bypass -Command "if(Test-Path '%LOG%'){Get-Content -Path '%LOG%' -Tail 35}" 2>nul
echo.
echo A diagnostic file is saved at:
echo %LOG%
echo.
echo Press any key to close this window.
pause >nul
exit /b !EXIT_CODE!

:NO_RUNTIME
echo ERROR: No compatible local runtime was found.
echo.
echo Jharkhandi can run with either:
echo   - Node.js 18 or newer ^(recommended: Node.js 22+^)
echo   - Python 3 as the built-in fallback server
>>"%LOG%" echo ERROR: Neither Node.js 18+ nor Python 3 was found.
echo.
echo Install Node.js from https://nodejs.org/ and run this file again.
echo.
pause
exit /b 1

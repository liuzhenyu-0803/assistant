@echo off
setlocal

echo Killing process on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  echo Stopping PID %%a on port 3000
  taskkill /F /PID %%a >nul 2>&1
)

echo Killing process on port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
  echo Stopping PID %%a on port 5173
  taskkill /F /PID %%a >nul 2>&1
)

echo Starting server in a new window...
start "assistant-server" cmd /k "cd /d %~dp0.. && pnpm dev:server"

echo Starting client in a new window...
start "assistant-client" cmd /k "cd /d %~dp0.. && pnpm dev:client"

echo Server and client restart commands have been launched.

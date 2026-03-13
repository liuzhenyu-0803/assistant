@echo off
setlocal

echo Killing process on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  echo Stopping PID %%a on port 3000
  taskkill /F /PID %%a >nul 2>&1
)

echo Starting server...
pnpm --filter @assistant/server dev

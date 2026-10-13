@echo off
rem Double-click: auto-sync missing days (F1.3 / F4.1 / F1.1) and keep the PC awake. Add --dry to only look.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto-sync-missing-days.ps1" --watch %*
pause

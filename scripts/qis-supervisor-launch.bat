@echo off
rem Runs the QIS V2 supervisor (started with no window by the Startup launcher, see install-qis-autostart.ps1).
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0qis-supervisor.ps1"

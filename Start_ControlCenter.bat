@echo off
title TTVH Control Center Launcher
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Normal -File "%~dp0TTVH_ControlCenter.ps1"

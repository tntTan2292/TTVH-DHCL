@echo off
rem Double-click: auto-sync missing days of F1.2 only (HUE + TCT) and keep the PC awake.
rem Add --dry to only look (nothing is started). Same supervisor as auto-sync-missing-days.bat, limited to F1.2.
rem HUE and TCT must already be signed in by hand in the DKCL windows; the QIS backend must be running.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto-sync-missing-days.ps1" --watch --indicator F1.2 %*
pause

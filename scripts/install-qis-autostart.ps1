# Installs (or removes with -Remove) the hidden QIS V2 auto-start for the current Windows user:
# a launcher in the Startup folder that runs scripts\qis-supervisor-launch.bat (-> qis-supervisor.ps1) with no window at every logon, and
# (with -StartNow) starts the supervisor right away. Re-running is safe.
param(
    [switch]$Remove,
    [switch]$StartNow
)

$ErrorActionPreference = 'Stop'
$launchBat = Join-Path $PSScriptRoot 'qis-supervisor-launch.bat'
$startupDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
$launcher = Join-Path $startupDir 'QIS_V2_AUTO.vbs'

if ($Remove) {
    if (Test-Path -LiteralPath $launcher) { Remove-Item -LiteralPath $launcher -Force; Write-Host "Removed $launcher" }
    else { Write-Host 'Nothing to remove.' }
    return
}

$command = '"{0}"' -f $launchBat
$vbs = @"
' QIS V2: start the supervisor with no window (window style 0). Created by scripts\install-qis-autostart.ps1
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "$($command.Replace('"','""'))", 0, False
Set WshShell = Nothing
"@
Set-Content -LiteralPath $launcher -Value $vbs -Encoding ASCII
Write-Host "Installed $launcher"

if ($StartNow) {
    Start-Process -FilePath 'wscript.exe' -ArgumentList ('"{0}"' -f $launcher) -WindowStyle Hidden
    Write-Host 'Supervisor started (hidden). Log: logs\supervisor.log'
}

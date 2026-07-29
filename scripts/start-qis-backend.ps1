$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$port = 5050

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

if ($listener) {
    $owningPid = $listener.OwningProcess
    $process = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
    $processName = if ($process) { $process.ProcessName } else { 'UNKNOWN' }

    Write-Host "PORT $port IS OCCUPIED"
    Write-Host "PID: $owningPid"
    Write-Host ("Process: {0}" -f $processName)
    Write-Host ("Stop instruction: Stop-Process -Id {0} -Force" -f $owningPid)
    exit 1
}

Set-Location -LiteralPath $backendDir
node .\server.js

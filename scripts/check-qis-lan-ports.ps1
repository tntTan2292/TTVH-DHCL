param(
    [int[]]$Ports = @(5178, 5050)
)

$hasConflict = $false

foreach ($port in $Ports) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

    if (-not $listeners) {
        Write-Host "PORT ${port}: AVAILABLE"
        continue
    }

    foreach ($listener in $listeners) {
        $hasConflict = $true
        $owningPid = $listener.OwningProcess
        $processName = '<unknown>'

        try {
            $processName = (Get-Process -Id $owningPid -ErrorAction Stop).ProcessName
        } catch {
            $processName = '<terminated or inaccessible>'
        }

        Write-Host "PORT ${port}: OCCUPIED"
        Write-Host "PID: $owningPid"
        Write-Host "Process: $processName"
        Write-Host "Stop instruction: Stop-Process -Id $owningPid -Force"
        Write-Host ""
    }
}

if ($hasConflict) {
    exit 1
}

Write-Host "QIS LAN port check passed for ports: $($Ports -join ', ')"

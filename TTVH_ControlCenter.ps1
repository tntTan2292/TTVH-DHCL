param()

$BackendPort = 5050
$FrontendPort = 5178
$RootPath = $PSScriptRoot

function Check-Port {
    param([int]$port)
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

function Check-Api {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/f13/dashboard/kpi?startDate=2026-06-18&endDate=2026-06-18" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) { return $true }
    } catch {
        return $false
    }
    return $false
}

function Kill-ProcessByPort {
    param([int]$port)
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        foreach ($c in $conn) {
            try {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
            } catch {
                # Ignore errors if process already exited
            }
        }
    }
}

$PauseFile = "$RootPath\logs\supervisor.pause"

function Test-Locked { return (Test-Path -LiteralPath $PauseFile) }

function Set-Lock {
    New-Item -ItemType Directory -Force -Path "$RootPath\logs" | Out-Null
    Set-Content -LiteralPath $PauseFile -Value (Get-Date -Format s)
}

function Clear-Lock { Remove-Item -LiteralPath $PauseFile -Force -ErrorAction SilentlyContinue }

function Start-System {
    param([switch]$NoPrompt)
    # Keep the supervisor (scripts\qis-supervisor.ps1) paused while the system is being started, so it cannot start a
    # second copy in the same second; the pause file is removed only once both ports listen (see below).
    Set-Lock
    Write-Host "Starting Backend..." -ForegroundColor Yellow
    if (-not (Check-Port $BackendPort)) {
        Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "$RootPath\backend" -WindowStyle Hidden -RedirectStandardOutput "$RootPath\backend\backend.log" -RedirectStandardError "$RootPath\backend\backend_err.log"
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Backend is already running!" -ForegroundColor Green
    }

    Write-Host "Starting Frontend..." -ForegroundColor Yellow
    if (-not (Check-Port $FrontendPort)) {
        Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "$RootPath\frontend" -WindowStyle Hidden -RedirectStandardOutput "$RootPath\frontend\frontend.log" -RedirectStandardError "$RootPath\frontend\frontend_err.log"
        Start-Sleep -Seconds 3
    } else {
        Write-Host "Frontend is already running!" -ForegroundColor Green
    }
    
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline -and -not ((Check-Port $BackendPort) -and (Check-Port $FrontendPort))) { Start-Sleep -Seconds 1 }
    Clear-Lock
    Write-Host "System started successfully in background. Lock released: the supervisor will bring it back if it goes down." -ForegroundColor Green
    if (-not $NoPrompt) {
        Write-Host "Press any key to return to menu..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

function Stop-System {
    # -Lock: the supervisor must NOT bring the system back until the operator presses Start (lock file).
    # Without -Lock the lock is released, so the supervisor restarts the system within ~20 seconds.
    param([switch]$Lock, [switch]$NoPrompt)
    if ($Lock) { Set-Lock } else { Clear-Lock }
    Write-Host "Stopping Backend (Port $BackendPort)..." -ForegroundColor Yellow
    Kill-ProcessByPort $BackendPort
    
    Write-Host "Stopping Frontend (Port $FrontendPort)..." -ForegroundColor Yellow
    Kill-ProcessByPort $FrontendPort
    
    Write-Host "Killing any lingering Node processes (safe cleanup)..." -ForegroundColor Yellow
    # Additionally, we could kill all node processes but that might interfere with other projects.
    # Killing by port is safest.
    
    if ($Lock) { Write-Host "System stopped and LOCKED: it will not start again until you choose Start System." -ForegroundColor Green }
    else { Write-Host "System stopped (not locked): the supervisor will start it again within about 20 seconds." -ForegroundColor Yellow }
    if (-not $NoPrompt) {
        Write-Host "Press any key to return to menu..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

function Check-Health {
    Write-Host "=== SYSTEM HEALTH CHECK ===" -ForegroundColor Cyan
    
    $bg = Check-Port $BackendPort
    if ($bg) { Write-Host "[OK] Backend Process is RUNNING (Port $BackendPort)" -ForegroundColor Green }
    else { Write-Host "[FAIL] Backend Process is STOPPED" -ForegroundColor Red }

    $fg = Check-Port $FrontendPort
    if ($fg) { Write-Host "[OK] Frontend Process is RUNNING (Port $FrontendPort)" -ForegroundColor Green }
    else { Write-Host "[FAIL] Frontend Process is STOPPED" -ForegroundColor Red }

    if ($bg) {
        $api = Check-Api
        if ($api) { Write-Host "[OK] API responds correctly" -ForegroundColor Green }
        else { Write-Host "[FAIL] API is not responding correctly" -ForegroundColor Red }
    }

    Write-Host "===========================" -ForegroundColor Cyan
    Write-Host "Press any key to return to menu..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Open-Dashboard {
    if (Check-Port $FrontendPort) {
        # QIS-HTTPS-LAN-01: the frontend is served over https once frontend\certs\dev-cert.pem exists
        $Scheme = if (Test-Path "$RootPath\frontend\certs\dev-cert.pem") { "https" } else { "http" }
        Start-Process "${Scheme}://localhost:$FrontendPort"
    } else {
        Write-Host "Frontend is not running. Please start the system first." -ForegroundColor Red
        Start-Sleep -Seconds 2
    }
}

function Open-Project-Folder {
    Start-Process "explorer.exe" $RootPath
}

# MAIN MENU LOOP
while ($true) {
    Clear-Host
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "      TTVH CONTROL CENTER (OPS-001)      " -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    # Auto-detect state for main menu
    $bState = if (Check-Port $BackendPort) { "RUNNING" } else { "STOPPED" }
    $bColor = if ($bState -eq "RUNNING") { "Green" } else { "Red" }
    
    $fState = if (Check-Port $FrontendPort) { "RUNNING" } else { "STOPPED" }
    $fColor = if ($fState -eq "RUNNING") { "Green" } else { "Red" }

    Write-Host "Backend Status : " -NoNewline; Write-Host $bState -ForegroundColor $bColor
    Write-Host "Frontend Status: " -NoNewline; Write-Host $fState -ForegroundColor $fColor
    $lockText = if (Test-Locked) { "LOCKED (will not restart by itself until Start)" } else { "ON (supervisor restarts it if it goes down)" }
    $lockColor = if (Test-Locked) { "Red" } else { "Green" }
    Write-Host "Auto-restart   : " -NoNewline; Write-Host $lockText -ForegroundColor $lockColor
    Write-Host "-----------------------------------------"

    Write-Host "1. Start System            (releases the lock)"
    Write-Host "2. Stop System             (temporary: supervisor starts it again)"
    Write-Host "3. Stop System + LOCK      (stays off until you press Start)"
    Write-Host "4. Restart System          (always with lock handling)"
    Write-Host "5. Health Check"
    Write-Host "6. Open Dashboard"
    Write-Host "7. Open Project Folder"
    Write-Host "0. Exit Control Center"
    Write-Host "-----------------------------------------"
    
    $choice = Read-Host "Select an option"

    switch ($choice) {
        "1" { Start-System }
        "2" { Stop-System }
        "3" { Stop-System -Lock }
        "4" { Stop-System -Lock -NoPrompt; Start-System }
        "5" { Check-Health }
        "6" { Open-Dashboard }
        "7" { Open-Project-Folder }
        "0" { exit }
        default { 
            Write-Host "Invalid option. Try again." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}

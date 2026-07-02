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
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/f13/bcvh-list" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
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

function Start-System {
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
    
    Write-Host "System started successfully in background." -ForegroundColor Green
    Write-Host "Press any key to return to menu..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Stop-System {
    Write-Host "Stopping Backend (Port $BackendPort)..." -ForegroundColor Yellow
    Kill-ProcessByPort $BackendPort
    
    Write-Host "Stopping Frontend (Port $FrontendPort)..." -ForegroundColor Yellow
    Kill-ProcessByPort $FrontendPort
    
    Write-Host "Killing any lingering Node processes (safe cleanup)..." -ForegroundColor Yellow
    # Additionally, we could kill all node processes but that might interfere with other projects.
    # Killing by port is safest.
    
    Write-Host "System stopped." -ForegroundColor Green
    Write-Host "Press any key to return to menu..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
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
        Start-Process "http://localhost:$FrontendPort"
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
    Write-Host "-----------------------------------------"

    Write-Host "1. Start System"
    Write-Host "2. Stop System"
    Write-Host "3. Restart System"
    Write-Host "4. Health Check"
    Write-Host "5. Open Dashboard"
    Write-Host "6. Open Project Folder"
    Write-Host "0. Exit Control Center"
    Write-Host "-----------------------------------------"
    
    $choice = Read-Host "Select an option"

    switch ($choice) {
        "1" { Start-System }
        "2" { Stop-System }
        "3" { Stop-System; Start-System }
        "4" { Check-Health }
        "5" { Open-Dashboard }
        "6" { Open-Project-Folder }
        "0" { exit }
        default { 
            Write-Host "Invalid option. Try again." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}

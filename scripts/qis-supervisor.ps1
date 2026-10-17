# QIS V2 supervisor: keeps the backend (5050) and the frontend (5178) running without any visible window.
# Started hidden at Windows logon by scripts\install-qis-autostart.ps1. Every CheckSeconds it looks at the two
# ports and starts whichever is missing (node server.js / npm run dev, both hidden, logs under logs\).
# Pause: while logs\supervisor.pause exists nothing is started (TTVH_ControlCenter "Stop System" creates it,
# "Start System" removes it). One instance only (named mutex).
param(
    [int]$BackendPort = 5050,
    [int]$FrontendPort = 5178,
    [int]$CheckSeconds = 20,
    [int]$GraceSeconds = 60,
    [switch]$Once,
    [switch]$DryRun
)

$RootPath = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $RootPath 'logs'
$PauseFile = Join-Path $LogDir 'supervisor.pause'
$SupervisorLog = Join-Path $LogDir $(if ($DryRun) { 'supervisor-dryrun.log' } else { 'supervisor.log' })
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log([string]$message) {
    if ((Test-Path -LiteralPath $SupervisorLog) -and (Get-Item -LiteralPath $SupervisorLog).Length -gt 1MB) {
        Move-Item -LiteralPath $SupervisorLog -Destination ($SupervisorLog + '.old') -Force
    }
    $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
    Add-Content -LiteralPath $SupervisorLog -Value $line -Encoding UTF8
    if ($DryRun) { Write-Host $line }
}

function Test-PortListening([int]$port) {
    return $null -ne (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Resolve-Tool([string]$name, [string[]]$fallbacks) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { return $cmd.Source }
    foreach ($path in $fallbacks) { if (Test-Path -LiteralPath $path) { return $path } }
    return $null
}

$NodeFallbacks = @(
    (Join-Path $env:USERPROFILE 'nodejs_portable_v22
ode-v22.12.0-win-x64
ode.exe'),
    'C:\Users\Admin\nodejs_portable_v22\node-v22.12.0-win-x64\node.exe',
    'D:\Setup\nodejs_portable\node-v22.12.0-win-x64\node.exe',
    'C:\Program Files\nodejs\node.exe'
)
$NpmFallbacks = @(
    (Join-Path $env:USERPROFILE 'nodejs_portable_v22
ode-v22.12.0-win-x64
pm.cmd'),
    'C:\Users\Admin\nodejs_portable_v22\node-v22.12.0-win-x64\npm.cmd',
    'D:\Setup\nodejs_portable\node-v22.12.0-win-x64\npm.cmd',
    'C:\Program Files\nodejs\npm.cmd'
)

function Remove-OldLogs {
    Get-ChildItem -LiteralPath $LogDir -Filter '*-20*.log' -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

function Start-Hidden([string]$label, [string]$file, [string]$arguments, [string]$workDir) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $out = Join-Path $LogDir ("{0}-{1}.out.log" -f $label, $stamp)
    $err = Join-Path $LogDir ("{0}-{1}.err.log" -f $label, $stamp)
    if ($DryRun) { Write-Log "DRYRUN would start $label : $file $arguments (cwd $workDir)"; return $true }
    try {
        Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $workDir -WindowStyle Hidden `
            -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
        Write-Log "started $label ($file $arguments)"
        return $true
    } catch {
        Write-Log "FAILED to start $label : $($_.Exception.Message)"
        return $false
    }
}

$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, 'Global\QIS_V2_SUPERVISOR', [ref]$createdNew)
if (-not $createdNew -and -not $DryRun) { exit 0 }

Write-Log "$(if ($DryRun) { 'DRYRUN ' })supervisor up (backend $BackendPort, frontend $FrontendPort, check ${CheckSeconds}s, pid $PID)"
$lastStart = @{ backend = [datetime]::MinValue; frontend = [datetime]::MinValue }
$recent = @{ backend = (New-Object 'System.Collections.Generic.List[datetime]'); frontend = (New-Object 'System.Collections.Generic.List[datetime]') }
$lastClean = [datetime]::MinValue
$lastPauseNote = [datetime]::MinValue
$missingNote = @{}

function Ensure-Service([string]$name, [int]$port, [scriptblock]$starter) {
    if (Test-Path -LiteralPath $PauseFile) {
        # say so once, then every 30 minutes, so a forgotten pause file is visible in the log
        if (((Get-Date) - $script:lastPauseNote).TotalMinutes -ge 30) {
            $since = (Get-Item -LiteralPath $PauseFile).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
            Write-Log "paused since $since (logs\supervisor.pause exists): $name will not be restarted until it is removed (Control Center -> Start System)"
            $script:lastPauseNote = Get-Date
        }
        return
    }
    if (Test-PortListening $port) { return }
    # confirm: a server that is just binding its port must not be started twice
    Start-Sleep -Seconds 3
    if (Test-PortListening $port) { return }
    $now = Get-Date
    if (($now - $lastStart[$name]).TotalSeconds -lt $GraceSeconds) { return }
    # crash-loop guard: more than 5 starts in 10 minutes -> wait 5 minutes
    [void]$recent[$name].RemoveAll([Predicate[datetime]]{ param($t) ($now - $t).TotalMinutes -ge 10 })
    if ($recent[$name].Count -ge 5) {
        if (($now - $lastStart[$name]).TotalMinutes -lt 5) { return }
        Write-Log "$name restarted 5 times in 10 minutes; retrying after the pause"
        $recent[$name].Clear()
    }
    Write-Log "$name is down (port $port) - starting"
    if (& $starter) { $lastStart[$name] = $now; [void]$recent[$name].Add($now) }
}

do {
    $node = Resolve-Tool 'node' $NodeFallbacks
    $npm = Resolve-Tool 'npm.cmd' $NpmFallbacks
    if (-not $node) { if (-not $missingNote['node']) { Write-Log 'node.exe not found (will keep checking, message shown once)'; $missingNote['node'] = $true } }
    else {
        Ensure-Service 'backend' $BackendPort { Start-Hidden 'backend' $node 'server.js' (Join-Path $RootPath 'backend') }
    }
    if (-not $npm) { if (-not $missingNote['npm']) { Write-Log 'npm.cmd not found (will keep checking, message shown once)'; $missingNote['npm'] = $true } }
    else {
        Ensure-Service 'frontend' $FrontendPort { Start-Hidden 'frontend' $npm 'run dev' (Join-Path $RootPath 'frontend') }
    }
    if (((Get-Date) - $lastClean).TotalHours -ge 6) { Remove-OldLogs; $lastClean = Get-Date }
    if (-not $Once) { Start-Sleep -Seconds $CheckSeconds }
} while (-not $Once)

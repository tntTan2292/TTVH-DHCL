# Launcher for scripts/auto-sync-missing-days.js: keeps Windows awake while it runs.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\auto-sync-missing-days.ps1 [--dry] [--watch] ...
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -Namespace Qis -Name Power -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint flags);
'@
# ES_CONTINUOUS | ES_SYSTEM_REQUIRED: no sleep while this window is open (the screen may still turn off).
[void][Qis.Power]::SetThreadExecutionState([uint32]'0x80000001')

# Turn off the console's QuickEdit mode: a stray mouse click in the window would otherwise freeze the output
# (title shows "Select ...") and with it this supervisor, until a key is pressed.
Add-Type -Namespace Qis -Name Console -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")] public static extern System.IntPtr GetStdHandle(int h);
[System.Runtime.InteropServices.DllImport("kernel32.dll")] public static extern bool GetConsoleMode(System.IntPtr h, out uint m);
[System.Runtime.InteropServices.DllImport("kernel32.dll")] public static extern bool SetConsoleMode(System.IntPtr h, uint m);
'@
try {
    $stdin = [Qis.Console]::GetStdHandle(-10)
    $mode = [uint32]0
    if ([Qis.Console]::GetConsoleMode($stdin, [ref]$mode)) {
        # clear ENABLE_QUICK_EDIT_MODE (0x40), keep the rest, set ENABLE_EXTENDED_FLAGS (0x80)
        [void][Qis.Console]::SetConsoleMode($stdin, (($mode -band (-bnot [uint32]0x40)) -bor [uint32]0x80))
    }
} catch { }

# Ask for the password here (hidden), pass it to node through its own environment only; never written to disk.
if (-not $env:QIS_ADMIN_PASSWORD) {
    $secure = Read-Host -Prompt 'Mat khau QIS cua admin' -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $env:QIS_ADMIN_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

try {
    Set-Location -LiteralPath $repoRoot
    node (Join-Path $PSScriptRoot 'auto-sync-missing-days.js') @args
    $code = $LASTEXITCODE
}
finally {
    [void][Qis.Power]::SetThreadExecutionState([uint32]'0x80000000')
}
exit $code

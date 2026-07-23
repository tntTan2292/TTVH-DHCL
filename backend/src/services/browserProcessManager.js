'use strict';

const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

class BrowserProcessManager {
    constructor({ execAsync = util.promisify(cp.exec), existsSync = fs.existsSync, rmSync = fs.rmSync } = {}) {
        this.execAsync = execAsync;
        this.existsSync = existsSync;
        this.rmSync = rmSync;
    }

    async findBrowserProcessByProfile(profileDir) {
        const result = {
            inspectionStatus: 'FAILED',
            matchingProcesses: [],
            errorCode: null
        };

        try {
            if (process.platform === 'win32') {
                try {
                    // Try CIM/WMI first
                    const { stdout } = await this.execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\' OR Name=\'msedge.exe\'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress"');
                    if (stdout.trim()) {
                        let processes = [];
                        try {
                            const parsed = JSON.parse(stdout);
                            processes = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {
                            result.inspectionStatus = 'AMBIGUOUS';
                            result.errorCode = 'PARSE_ERROR';
                            return result;
                        }

                        for (const proc of processes) {
                            const cmdLine = proc.CommandLine || '';
                            if (cmdLine.toLowerCase().includes('--user-data-dir')) {
                                const match = cmdLine.match(/--user-data-dir=(?:"([^"]+)"|([^\s]+))/i);
                                if (match) {
                                    const dir = match[1] || match[2];
                                    if (path.resolve(dir).toLowerCase() === path.resolve(profileDir).toLowerCase()) {
                                        result.matchingProcesses.push({
                                            pid: parseInt(proc.ProcessId, 10),
                                            executable: 'chrome.exe',
                                            commandLine: cmdLine,
                                            exactProfileMatch: true,
                                            ownershipEvidence: true
                                        });
                                    }
                                }
                            }
                        }
                        result.inspectionStatus = 'SUCCESS';
                        return result;
                    } else {
                        result.inspectionStatus = 'SUCCESS';
                        return result; // No processes found
                    }
                } catch (cimErr) {
                    // Fallback to wmic
                    const { stdout } = await this.execAsync('wmic process where "name=\'chrome.exe\' or name=\'msedge.exe\'" get ProcessId,CommandLine /FORMAT:CSV');
                    const lines = stdout.split('\n');
                    for (let line of lines) {
                        line = line.trim();
                        if (!line) continue;
                        const parts = line.split(',');
                        if (parts.length >= 3) {
                            const pidStr = parts[parts.length - 1];
                            const cmdLine = parts.slice(1, parts.length - 1).join(',');
                            if (cmdLine.toLowerCase().includes('--user-data-dir')) {
                                const match = cmdLine.match(/--user-data-dir=(?:"([^"]+)"|([^\s]+))/i);
                                if (match) {
                                    const dir = match[1] || match[2];
                                    if (path.resolve(dir).toLowerCase() === path.resolve(profileDir).toLowerCase()) {
                                        result.matchingProcesses.push({
                                            pid: parseInt(pidStr, 10),
                                            executable: 'chrome.exe',
                                            commandLine: cmdLine,
                                            exactProfileMatch: true,
                                            ownershipEvidence: true
                                        });
                                    }
                                }
                            }
                        }
                    }
                    result.inspectionStatus = 'SUCCESS';
                    return result;
                }
            } else {
                const { stdout } = await this.execAsync('ps -e -o pid,command');
                const lines = stdout.split('\n');
                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;
                    if (line.toLowerCase().includes('--user-data-dir')) {
                        const match = line.match(/^(\d+)\s+(.+)$/);
                        if (match) {
                            const pidStr = match[1];
                            const cmdLine = match[2];
                            const dirMatch = cmdLine.match(/--user-data-dir=(?:"([^"]+)"|([^\s]+))/i);
                            if (dirMatch) {
                                const dir = dirMatch[1] || dirMatch[2];
                                if (path.resolve(dir) === path.resolve(profileDir)) {
                                    result.matchingProcesses.push({
                                        pid: parseInt(pidStr, 10),
                                        executable: 'browser',
                                        commandLine: cmdLine,
                                        exactProfileMatch: true,
                                        ownershipEvidence: true
                                    });
                                }
                            }
                        }
                    }
                }
                result.inspectionStatus = 'SUCCESS';
                return result;
            }
        } catch (err) {
            result.inspectionStatus = 'FAILED';
            result.errorCode = err.message;
        }
        return result;
    }

    async getDescendantProcessIds(rootPids) {
        const roots = new Set((rootPids || []).map((pid) => Number(pid)).filter(Number.isFinite));
        if (roots.size === 0 || process.platform !== 'win32') return Array.from(roots);

        try {
            const { stdout } = await this.execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId | ConvertTo-Json -Compress"');
            const parsed = stdout.trim() ? JSON.parse(stdout) : [];
            const processes = Array.isArray(parsed) ? parsed : [parsed];
            let changed = true;
            while (changed) {
                changed = false;
                for (const proc of processes) {
                    const pid = Number(proc.ProcessId);
                    const parentPid = Number(proc.ParentProcessId);
                    if (Number.isFinite(pid) && roots.has(parentPid) && !roots.has(pid)) {
                        roots.add(pid);
                        changed = true;
                    }
                }
            }
        } catch (_) {
            return Array.from(roots);
        }
        return Array.from(roots);
    }

    async setWindowsVisibleForProcessIds(pids, visible) {
        const targetPids = (pids || []).map((pid) => Number(pid)).filter(Number.isFinite);
        if (targetPids.length === 0 || process.platform !== 'win32') {
            return {
                success: false,
                action: visible ? 'SHOW' : 'HIDE',
                matchedWindowCount: 0,
                affectedWindowCount: 0,
                errorCode: process.platform === 'win32' ? 'NO_PROCESS_IDS' : 'UNSUPPORTED_PLATFORM'
            };
        }

        const action = visible ? 'SHOW' : 'HIDE';
        const showCommand = visible ? 5 : 0; // SW_SHOW / SW_HIDE
        const script = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class NativeWindow {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll", SetLastError=true)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
}
"@
$targetPids = @(${targetPids.join(',')})
$showCommand = ${showCommand}
$matches = New-Object System.Collections.Generic.List[object]
$script:affected = 0
$callback = [NativeWindow+EnumWindowsProc]{
  param([IntPtr]$hWnd, [IntPtr]$lParam)
  [uint32]$pid = 0
  [void][NativeWindow]::GetWindowThreadProcessId($hWnd, [ref]$pid)
  if ($targetPids -contains [int]$pid) {
    $titleBuilder = New-Object System.Text.StringBuilder 512
    [void][NativeWindow]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
    $wasVisible = [NativeWindow]::IsWindowVisible($hWnd)
    $ok = [NativeWindow]::ShowWindow($hWnd, $showCommand)
    $isVisible = [NativeWindow]::IsWindowVisible($hWnd)
    if ((${visible ? '$isVisible' : '-not $isVisible'})) { $script:affected += 1 }
    $matches.Add([pscustomobject]@{
      hwnd = $hWnd.ToInt64()
      pid = [int]$pid
      title = $titleBuilder.ToString()
      wasVisible = [bool]$wasVisible
      isVisible = [bool]$isVisible
      nativeResult = [bool]$ok
    })
  }
  return $true
}
[void][NativeWindow]::EnumWindows($callback, [IntPtr]::Zero)
[pscustomobject]@{
  success = ($matches.Count -gt 0 -and $affected -gt 0)
  action = '${action}'
  matchedWindowCount = $matches.Count
  affectedWindowCount = $script:affected
  windows = $matches
} | ConvertTo-Json -Compress -Depth 5
`;
        const encoded = Buffer.from(script, 'utf16le').toString('base64');
        try {
            const { stdout } = await this.execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`);
            return stdout.trim()
                ? JSON.parse(stdout)
                : { success: false, action, matchedWindowCount: 0, affectedWindowCount: 0, errorCode: 'NO_OUTPUT' };
        } catch (error) {
            return {
                success: false,
                action,
                matchedWindowCount: 0,
                affectedWindowCount: 0,
                errorCode: 'NATIVE_WINDOW_COMMAND_FAILED'
            };
        }
    }

    async setWindowVisibleByHandleForProfile(profileDir, windowHandle, visible) {
        const hwnd = Number(windowHandle);
        if (!Number.isFinite(hwnd) || hwnd <= 0 || process.platform !== 'win32') {
            return {
                success: false,
                action: visible ? 'SHOW' : 'HIDE',
                hwnd,
                errorCode: process.platform === 'win32' ? 'INVALID_WINDOW_HANDLE' : 'UNSUPPORTED_PLATFORM'
            };
        }

        const inspection = await this.findBrowserProcessByProfile(profileDir);
        if (inspection.inspectionStatus !== 'SUCCESS' || inspection.matchingProcesses.length === 0) {
            return {
                success: false,
                action: visible ? 'SHOW' : 'HIDE',
                hwnd,
                inspection,
                errorCode: inspection.errorCode || inspection.inspectionStatus
            };
        }

        const rootPids = inspection.matchingProcesses.map((proc) => proc.pid);
        const processIds = await this.getDescendantProcessIds(rootPids);
        const showCommand = visible ? 5 : 0;
        const action = visible ? 'SHOW' : 'HIDE';
        const script = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NativeWindowHandle {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$hwnd = [IntPtr]${hwnd}
$targetPids = @(${processIds.join(',')})
$showCommand = ${showCommand}
[uint32]$pid = 0
[void][NativeWindowHandle]::GetWindowThreadProcessId($hwnd, [ref]$pid)
$owned = $targetPids -contains [int]$pid
$beforeVisible = [NativeWindowHandle]::IsWindowVisible($hwnd)
$nativeResult = $false
if ($owned) {
  $nativeResult = [NativeWindowHandle]::ShowWindow($hwnd, $showCommand)
}
$afterVisible = [NativeWindowHandle]::IsWindowVisible($hwnd)
[pscustomobject]@{
  success = ($owned -and ${visible ? '$afterVisible' : '-not $afterVisible'})
  action = '${action}'
  hwnd = ${hwnd}
  pid = [int]$pid
  owned = [bool]$owned
  wasVisible = [bool]$beforeVisible
  isVisible = [bool]$afterVisible
  nativeResult = [bool]$nativeResult
} | ConvertTo-Json -Compress
`;
        const encoded = Buffer.from(script, 'utf16le').toString('base64');
        try {
            const { stdout } = await this.execAsync(`powershell -NoProfile -EncodedCommand ${encoded}`);
            const native = stdout.trim()
                ? JSON.parse(stdout)
                : { success: false, action, hwnd, errorCode: 'NO_OUTPUT' };
            return {
                ...native,
                profileDir,
                rootPids,
                processIds,
                inspection
            };
        } catch (error) {
            return {
                success: false,
                action,
                hwnd,
                profileDir,
                rootPids,
                processIds,
                inspection,
                errorCode: 'NATIVE_WINDOW_HANDLE_COMMAND_FAILED'
            };
        }
    }

    async setBrowserWindowsVisibleByProfile(profileDir, visible) {
        const inspection = await this.findBrowserProcessByProfile(profileDir);
        if (inspection.inspectionStatus !== 'SUCCESS' || inspection.matchingProcesses.length === 0) {
            return {
                success: false,
                action: visible ? 'SHOW' : 'HIDE',
                profileDir,
                inspection,
                errorCode: inspection.errorCode || inspection.inspectionStatus
            };
        }
        const rootPids = inspection.matchingProcesses.map((proc) => proc.pid);
        const processIds = await this.getDescendantProcessIds(rootPids);
        const result = await this.setWindowsVisibleForProcessIds(processIds, visible);
        return {
            ...result,
            profileDir,
            rootPids,
            processIds,
            inspection
        };
    }

    async hideBrowserWindowsByProfile(profileDir) {
        return this.setBrowserWindowsVisibleByProfile(profileDir, false);
    }

    async showBrowserWindowsByProfile(profileDir) {
        return this.setBrowserWindowsVisibleByProfile(profileDir, true);
    }

    async terminateProcessTree(pid) {
        try {
            if (process.platform === 'win32') {
                await this.execAsync(`taskkill /pid ${pid} /t /f`);
            } else {
                await this.execAsync(`kill -9 ${pid}`);
            }
            await new Promise(res => setTimeout(res, 2000));
        } catch (err) {
            throw new Error('ORPHAN_PROCESS_RECOVERY_FAILED');
        }
    }

    cleanupStaleLocks(profileDir) {
        const lockDir = `${profileDir}.lock`;
        const singletonLock = path.join(profileDir, 'SingletonLock');
        const singletonCookie = path.join(profileDir, 'SingletonCookie');

        const removeFileOrDir = (target) => {
            try {
                if (this.existsSync(target)) {
                    this.rmSync(target, { recursive: true, force: true });
                }
            } catch (err) {
                // ignore
            }
        };

        removeFileOrDir(lockDir);
        removeFileOrDir(singletonLock);
        removeFileOrDir(singletonCookie);
    }
}

// Export default instance for normal use, but allow creating new instances for tests
const defaultInstance = new BrowserProcessManager();

module.exports = {
    BrowserProcessManager,
    findBrowserProcessByProfile: defaultInstance.findBrowserProcessByProfile.bind(defaultInstance),
    terminateProcessTree: defaultInstance.terminateProcessTree.bind(defaultInstance),
    cleanupStaleLocks: defaultInstance.cleanupStaleLocks.bind(defaultInstance),
    hideBrowserWindowsByProfile: defaultInstance.hideBrowserWindowsByProfile.bind(defaultInstance),
    showBrowserWindowsByProfile: defaultInstance.showBrowserWindowsByProfile.bind(defaultInstance),
    setWindowVisibleByHandleForProfile: defaultInstance.setWindowVisibleByHandleForProfile.bind(defaultInstance)
};

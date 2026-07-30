'use strict';

const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const nativeWindowManager = require('./nativeWindowManager');

function normalizeProfilePath(inputPath) {
    const resolved = path.resolve(String(inputPath || ''));
    return resolved.replace(/[\\/]+$/, '').toLowerCase();
}

function extractUserDataDir(commandLine) {
    const value = String(commandLine || '');
    if (!value) return null;

    const normalized = value.replace(/"--user-data-dir=([^"]+)"/i, '--user-data-dir="$1"');

    const inlineQuotedMatch = normalized.match(/--user-data-dir=(?:"([^"]+)"|'([^']+)')/i);
    if (inlineQuotedMatch) {
        return inlineQuotedMatch[1] || inlineQuotedMatch[2] || null;
    }

    const inlineBareMatch = normalized.match(/--user-data-dir=([^\s"]+)/i);
    if (inlineBareMatch) {
        return inlineBareMatch[1] || null;
    }

    const separatedMatch = normalized.match(/--user-data-dir\s+(?:"([^"]+)"|'([^']+)'|([^\s"]+))/i);
    if (separatedMatch) {
        return separatedMatch[1] || separatedMatch[2] || separatedMatch[3] || null;
    }

    return null;
}

class BrowserProcessManager {
    constructor({ execAsync = util.promisify(cp.exec), existsSync = fs.existsSync, rmSync = fs.rmSync, nativeWindows = nativeWindowManager } = {}) {
        this.execAsync = execAsync;
        this.existsSync = existsSync;
        this.rmSync = rmSync;
        this.nativeWindows = nativeWindows;
        this.hiddenHwndsByProfile = new Map();
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
                    // Query browser-like processes broadly, then accept only exact --user-data-dir matches.
                    const { stdout } = await this.execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object CommandLine -Match \'--user-data-dir\' | Select-Object ProcessId, Name, ExecutablePath, CommandLine | ConvertTo-Json -Compress"');
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
                                const dir = extractUserDataDir(cmdLine);
                                if (dir && normalizeProfilePath(dir) === normalizeProfilePath(profileDir)) {
                                    result.matchingProcesses.push({
                                        pid: parseInt(proc.ProcessId, 10),
                                        executable: proc.Name || path.basename(proc.ExecutablePath || '') || 'browser',
                                        executablePath: proc.ExecutablePath || null,
                                        commandLine: cmdLine,
                                        exactProfileMatch: true,
                                        ownershipEvidence: true
                                    });
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
                    const { stdout } = await this.execAsync('wmic process get ProcessId,Name,ExecutablePath,CommandLine /FORMAT:CSV');
                    const lines = stdout.split('\n');
                    for (let line of lines) {
                        line = line.trim();
                        if (!line) continue;
                        const parts = line.split(',');
                        if (parts.length >= 5) {
                            const pidStr = parts[parts.length - 1];
                            const name = parts[parts.length - 2];
                            const executablePath = parts[parts.length - 3];
                            const cmdLine = parts.slice(1, parts.length - 3).join(',');
                            if (cmdLine.toLowerCase().includes('--user-data-dir')) {
                                const dir = extractUserDataDir(cmdLine);
                                if (dir && normalizeProfilePath(dir) === normalizeProfilePath(profileDir)) {
                                    result.matchingProcesses.push({
                                        pid: parseInt(pidStr, 10),
                                        executable: name || path.basename(executablePath || '') || 'browser',
                                        executablePath: executablePath || null,
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
                        const dir = extractUserDataDir(cmdLine);
                        if (dir && normalizeProfilePath(dir) === normalizeProfilePath(profileDir)) {
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
        if (typeof this.nativeWindows.getDescendantProcessIds === 'function') {
            return this.nativeWindows.getDescendantProcessIds(rootPids);
        }
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

        try {
            return this.nativeWindows.setWindowsVisibleForProcessIds(targetPids, visible);
        } catch (error) {
            return {
                success: false,
                action: visible ? 'SHOW' : 'HIDE',
                matchedWindowCount: 0,
                affectedWindowCount: 0,
                errorCode: 'NATIVE_WINDOW_FFI_FAILED'
            };
        }
    }

    async setBrowserWindowsVisibleByProfile(profileDir, visible, maxRetries = 10, retryDelayMs = 500) {
        const normalizedProfileDir = path.resolve(profileDir).toLowerCase();
        let attempts = 0;
        let lastResult = null;

        while (attempts < maxRetries) {
            attempts++;
            const inspection = await this.findBrowserProcessByProfile(profileDir);
            
            if (inspection.inspectionStatus !== 'SUCCESS' || inspection.matchingProcesses.length === 0) {
                lastResult = {
                    success: false,
                    action: visible ? 'SHOW' : 'HIDE',
                    profileDir,
                    inspection,
                    errorCode: inspection.errorCode || inspection.inspectionStatus,
                    status: 'VERIFYING',
                    attempts
                };
                await new Promise(r => setTimeout(r, retryDelayMs));
                continue;
            }

            const rootPids = inspection.matchingProcesses.map((proc) => proc.pid);
            const processIds = await this.getDescendantProcessIds(rootPids);
            
            const options = visible && this.hiddenHwndsByProfile.has(normalizedProfileDir)
                ? { hwndAllowList: this.hiddenHwndsByProfile.get(normalizedProfileDir) }
                : {};
                
            let result;
            try {
                result = await this.nativeWindows.setWindowsVisibleForProcessIds(processIds, visible, options);
            } catch (error) {
                result = {
                    success: false,
                    action: visible ? 'SHOW' : 'HIDE',
                    matchedWindowCount: 0,
                    affectedWindowCount: 0,
                    errorCode: 'NATIVE_WINDOW_FFI_FAILED'
                };
            }

            if (!visible) {
                const recordedHwnds = this.hiddenHwndsByProfile.get(normalizedProfileDir) || [];
                const currentHwndsSet = new Set((result.windows || []).map(w => w.hwnd));
                const validRecordedHwnds = recordedHwnds.filter(hwnd => currentHwndsSet.has(hwnd));

                const alreadyHasRecord = validRecordedHwnds.length > 0;
                const actuallyHidVisibleWindow = (result.windows || []).some(w => w.wasVisible && !w.isVisible);
                const isReliableHide = alreadyHasRecord || actuallyHidVisibleWindow;

                if (result.success && isReliableHide) {
                    const hiddenHwnds = (result.windows || [])
                        .filter((win) => win.wasVisible && !win.isVisible)
                        .map((win) => win.hwnd);
                    if (hiddenHwnds.length > 0) {
                        const merged = Array.from(new Set([...validRecordedHwnds, ...hiddenHwnds]));
                        this.hiddenHwndsByProfile.set(normalizedProfileDir, merged);
                    } else if (validRecordedHwnds.length > 0) {
                        this.hiddenHwndsByProfile.set(normalizedProfileDir, validRecordedHwnds);
                    }
                    
                    return {
                        ...result,
                        profileDir,
                        rootPids,
                        processIds,
                        inspection,
                        status: 'SUCCESS',
                        attempts
                    };
                } else {
                    lastResult = {
                        ...result,
                        profileDir,
                        rootPids,
                        processIds,
                        inspection,
                        status: 'VERIFYING',
                        attempts
                    };
                    await new Promise(r => setTimeout(r, retryDelayMs));
                    continue;
                }
            } else {
                if (result.success) {
                    this.hiddenHwndsByProfile.delete(normalizedProfileDir);
                    return {
                        ...result,
                        profileDir,
                        rootPids,
                        processIds,
                        inspection,
                        status: 'SUCCESS',
                        attempts
                    };
                } else {
                    lastResult = {
                        ...result,
                        profileDir,
                        rootPids,
                        processIds,
                        inspection,
                        status: 'VERIFYING',
                        attempts
                    };
                    await new Promise(r => setTimeout(r, retryDelayMs));
                    continue;
                }
            }
        }
        
        if (lastResult) {
            lastResult.status = 'FAILED';
            lastResult.errorCode = 'MAX_RETRIES_EXCEEDED';
        }
        return lastResult;
    }

    async hideBrowserWindowsByProfile(profileDir) {
        return this.setBrowserWindowsVisibleByProfile(profileDir, false);
    }

    async showBrowserWindowsByProfile(profileDir) {
        return this.setBrowserWindowsVisibleByProfile(profileDir, true);
    }

    clearHiddenHwnds(profileDir) {
        const normalizedProfileDir = path.resolve(profileDir).toLowerCase();
        this.hiddenHwndsByProfile.delete(normalizedProfileDir);
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
    defaultInstance,
    extractUserDataDir,
    findBrowserProcessByProfile: defaultInstance.findBrowserProcessByProfile.bind(defaultInstance),
    terminateProcessTree: defaultInstance.terminateProcessTree.bind(defaultInstance),
    cleanupStaleLocks: defaultInstance.cleanupStaleLocks.bind(defaultInstance),
    hideBrowserWindowsByProfile: defaultInstance.hideBrowserWindowsByProfile.bind(defaultInstance),
    showBrowserWindowsByProfile: defaultInstance.showBrowserWindowsByProfile.bind(defaultInstance),
    clearHiddenHwnds: defaultInstance.clearHiddenHwnds.bind(defaultInstance)
};

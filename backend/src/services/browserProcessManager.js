'use strict';

const cp = require('child_process');
const koffi = require('koffi');
const path = require('path');
const fs = require('fs');
const util = require('util');
const nativeWindowManager = require('./nativeWindowManager');

let windowsProcessApi = null;

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

function getWindowsProcessApi() {
    if (process.platform !== 'win32') return null;
    if (windowsProcessApi) return windowsProcessApi;

    const kernel32 = koffi.load('kernel32.dll');
    const ntdll = koffi.load('ntdll.dll');
    const HANDLE = koffi.pointer('PM_HANDLE', koffi.opaque());
    const PROCESSENTRY32 = koffi.struct('PROCESSENTRY32_PM', {
        dwSize: 'uint32_t',
        cntUsage: 'uint32_t',
        th32ProcessID: 'uint32_t',
        th32DefaultHeapID: 'uint64_t',
        th32ModuleID: 'uint32_t',
        cntThreads: 'uint32_t',
        th32ParentProcessID: 'uint32_t',
        pcPriClassBase: 'int32_t',
        dwFlags: 'uint32_t',
        szExeFile: koffi.array('char', 260)
    });
    const UNICODE_STRING = koffi.struct('UNICODE_STRING_PM', {
        Length: 'uint16_t',
        MaximumLength: 'uint16_t',
        Buffer: 'void *'
    });
    const PROCESS_BASIC_INFORMATION = koffi.struct('PROCESS_BASIC_INFORMATION_PM', {
        Reserved1: 'void *',
        PebBaseAddress: 'void *',
        Reserved2: koffi.array('void *', 2),
        UniqueProcessId: 'uintptr_t',
        InheritedFromUniqueProcessId: 'uintptr_t'
    });
    const PEB = koffi.struct('PEB_PM', {
        Reserved1: koffi.array('uint8_t', 4),
        Reserved2: koffi.array('void *', 2),
        Ldr: 'void *',
        ProcessParameters: 'void *'
    });
    const RTL_USER_PROCESS_PARAMETERS = koffi.struct('RTL_USER_PROCESS_PARAMETERS_PM', {
        Reserved1: koffi.array('uint8_t', 16),
        Reserved2: koffi.array('void *', 10),
        ImagePathName: UNICODE_STRING,
        CommandLine: UNICODE_STRING
    });

    windowsProcessApi = {
        TH32CS_SNAPPROCESS: 0x00000002,
        PROCESS_QUERY_INFORMATION: 0x0400,
        PROCESS_VM_READ: 0x0010,
        CreateToolhelp32Snapshot: kernel32.func('PM_HANDLE __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)'),
        Process32First: kernel32.func('bool __stdcall Process32First(PM_HANDLE hSnapshot, _Inout_ PROCESSENTRY32_PM *lppe)'),
        Process32Next: kernel32.func('bool __stdcall Process32Next(PM_HANDLE hSnapshot, _Inout_ PROCESSENTRY32_PM *lppe)'),
        OpenProcess: kernel32.func('PM_HANDLE __stdcall OpenProcess(uint32_t dwDesiredAccess, bool bInheritHandle, uint32_t dwProcessId)'),
        ReadProcessMemory: kernel32.func('bool __stdcall ReadProcessMemory(PM_HANDLE hProcess, void *lpBaseAddress, _Out_ void *lpBuffer, size_t nSize, void *lpNumberOfBytesRead)'),
        CloseHandle: kernel32.func('bool __stdcall CloseHandle(PM_HANDLE hObject)'),
        NtQueryInformationProcess: ntdll.func('uint32_t __stdcall NtQueryInformationProcess(PM_HANDLE ProcessHandle, uint32_t ProcessInformationClass, _Out_ void *ProcessInformation, uint32_t ProcessInformationLength, void *ReturnLength)'),
        PROCESSENTRY32,
        PROCESS_BASIC_INFORMATION,
        PEB,
        RTL_USER_PROCESS_PARAMETERS
    };
    return windowsProcessApi;
}

function readNullTerminatedAnsi(buffer) {
    const end = buffer.indexOf(0);
    return buffer.slice(0, end >= 0 ? end : buffer.length).toString('ascii');
}

function readRemoteUnicodeString(api, processHandle, unicodeString) {
    const length = Number(unicodeString?.Length || 0);
    const pointer = unicodeString?.Buffer;
    if (!pointer || length <= 0) return '';
    const output = Buffer.alloc(length);
    const success = api.ReadProcessMemory(processHandle, pointer, output, output.length, null);
    if (!success) return '';
    return output.toString('utf16le').replace(/\0+$/, '');
}

function readWindowsProcessDetails(api, pid, executableName, parentPid) {
    const handle = api.OpenProcess(api.PROCESS_QUERY_INFORMATION | api.PROCESS_VM_READ, false, pid);
    if (!handle) {
        return {
            ProcessId: pid,
            ParentProcessId: parentPid,
            Name: executableName,
            ExecutablePath: null,
            CommandLine: ''
        };
    }

    try {
        const basicInfoBuffer = Buffer.alloc(koffi.sizeof(api.PROCESS_BASIC_INFORMATION));
        const ntStatus = api.NtQueryInformationProcess(handle, 0, basicInfoBuffer, basicInfoBuffer.length, null);
        if (ntStatus !== 0) {
            return {
                ProcessId: pid,
                ParentProcessId: parentPid,
                Name: executableName,
                ExecutablePath: null,
                CommandLine: ''
            };
        }

        const basicInfo = koffi.decode(basicInfoBuffer, api.PROCESS_BASIC_INFORMATION);
        if (!basicInfo?.PebBaseAddress) {
            return {
                ProcessId: pid,
                ParentProcessId: parentPid,
                Name: executableName,
                ExecutablePath: null,
                CommandLine: ''
            };
        }

        const pebBuffer = Buffer.alloc(koffi.sizeof(api.PEB));
        if (!api.ReadProcessMemory(handle, basicInfo.PebBaseAddress, pebBuffer, pebBuffer.length, null)) {
            return {
                ProcessId: pid,
                ParentProcessId: parentPid,
                Name: executableName,
                ExecutablePath: null,
                CommandLine: ''
            };
        }

        const peb = koffi.decode(pebBuffer, api.PEB);
        if (!peb?.ProcessParameters) {
            return {
                ProcessId: pid,
                ParentProcessId: parentPid,
                Name: executableName,
                ExecutablePath: null,
                CommandLine: ''
            };
        }

        const paramsBuffer = Buffer.alloc(koffi.sizeof(api.RTL_USER_PROCESS_PARAMETERS));
        if (!api.ReadProcessMemory(handle, peb.ProcessParameters, paramsBuffer, paramsBuffer.length, null)) {
            return {
                ProcessId: pid,
                ParentProcessId: parentPid,
                Name: executableName,
                ExecutablePath: null,
                CommandLine: ''
            };
        }

        const processParams = koffi.decode(paramsBuffer, api.RTL_USER_PROCESS_PARAMETERS);
        const executablePath = readRemoteUnicodeString(api, handle, processParams.ImagePathName) || null;
        const commandLine = readRemoteUnicodeString(api, handle, processParams.CommandLine);

        return {
            ProcessId: pid,
            ParentProcessId: parentPid,
            Name: executableName,
            ExecutablePath: executablePath,
            CommandLine: commandLine
        };
    } finally {
        api.CloseHandle(handle);
    }
}

function enumerateWindowsProcessesNative() {
    const api = getWindowsProcessApi();
    if (!api) {
        throw new Error('PROCESS_INSPECTION_FAILED');
    }

    const snapshot = api.CreateToolhelp32Snapshot(api.TH32CS_SNAPPROCESS, 0);
    if (!snapshot) {
        throw new Error('PROCESS_INSPECTION_FAILED');
    }

    try {
        const entry = { dwSize: koffi.sizeof(api.PROCESSENTRY32) };
        const processes = [];
        let hasNext = api.Process32First(snapshot, entry);
        while (hasNext) {
            const pid = Number(entry.th32ProcessID);
            const parentPid = Number(entry.th32ParentProcessID);
            const executableName = readNullTerminatedAnsi(Buffer.from(entry.szExeFile));
            processes.push(readWindowsProcessDetails(api, pid, executableName, parentPid));
            hasNext = api.Process32Next(snapshot, entry);
        }
        return processes;
    } finally {
        api.CloseHandle(snapshot);
    }
}

function selectBrowserRootProcesses(processes) {
    const allMatches = Array.isArray(processes) ? processes : [];
    const rootCandidates = allMatches.filter((proc) => !/\s--type=/.test(String(proc.commandLine || '')));
    return rootCandidates.length > 0 ? rootCandidates : allMatches;
}

class BrowserProcessManager {
    constructor({ execFileAsync = util.promisify(cp.execFile), existsSync = fs.existsSync, rmSync = fs.rmSync, nativeWindows = nativeWindowManager, processEnumerator = null } = {}) {
        this.execFileAsync = execFileAsync;
        this.existsSync = existsSync;
        this.rmSync = rmSync;
        this.nativeWindows = nativeWindows;
        this.processEnumerator = processEnumerator;
        this.hiddenHwndsByProfile = new Map();
    }

    async runCommand(file, args) {
        if (typeof this.execFileAsync === 'function') {
            return this.execFileAsync(file, args, { shell: false, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
        }
        throw new Error('PROCESS_EXECUTOR_UNAVAILABLE');
    }

    async findBrowserProcessByProfile(profileDir) {
        const result = {
            inspectionStatus: 'FAILED',
            matchingProcesses: [],
            errorCode: null
        };

        try {
            if (process.platform === 'win32') {
                const processes = (this.processEnumerator || enumerateWindowsProcessesNative)();
                for (const proc of processes) {
                    const cmdLine = proc.CommandLine || '';
                    if (!cmdLine.toLowerCase().includes('--user-data-dir')) continue;
                    const dir = extractUserDataDir(cmdLine);
                    if (dir && normalizeProfilePath(dir) === normalizeProfilePath(profileDir)) {
                        result.matchingProcesses.push({
                            pid: parseInt(proc.ProcessId, 10),
                            parentPid: Number(proc.ParentProcessId),
                            executable: proc.Name || path.basename(proc.ExecutablePath || '') || 'browser',
                            executablePath: proc.ExecutablePath || null,
                            commandLine: cmdLine,
                            exactProfileMatch: true,
                            ownershipEvidence: true
                        });
                    }
                }
                result.inspectionStatus = 'SUCCESS';
                return result;
            } else {
                const { stdout } = await this.runCommand('ps', ['-e', '-o', 'pid,command']);
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
            result.errorCode = err?.message || 'PROCESS_INSPECTION_FAILED';
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
            return this.nativeWindows.getDescendantProcessIds(Array.from(roots));
        } catch (_) {
            return Array.from(roots);
        }
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

            const rootPids = selectBrowserRootProcesses(inspection.matchingProcesses).map((proc) => proc.pid);
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
                await this.runCommand('taskkill.exe', ['/pid', String(pid), '/t', '/f']);
            } else {
                await this.runCommand('kill', ['-9', String(pid)]);
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

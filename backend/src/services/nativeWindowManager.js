'use strict';

const koffi = require('koffi');

const user32 = process.platform === 'win32' ? koffi.load('user32.dll') : null;
const kernel32 = process.platform === 'win32' ? koffi.load('kernel32.dll') : null;

let api = null;

function getApi() {
    if (process.platform !== 'win32') return null;
    if (api) return api;

    const DWORD = koffi.alias('DWORD', 'uint32_t');
    const BOOL = koffi.alias('BOOL', 'bool');
    const LPARAM = koffi.alias('LPARAM', 'intptr_t');
    const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
    const HWND = koffi.alias('HWND', HANDLE);
    const EnumWindowsProc = koffi.proto('BOOL __stdcall EnumWindowsProc(HWND hWnd, LPARAM lParam)');

    const TH32CS_SNAPPROCESS = 0x00000002;
    const PROCESSENTRY32 = koffi.struct('PROCESSENTRY32', {
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

    api = {
        EnumWindows: user32.func('BOOL __stdcall EnumWindows(EnumWindowsProc *lpEnumFunc, LPARAM lParam)'),
        GetWindowThreadProcessId: user32.func('DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ DWORD *lpdwProcessId)'),
        IsWindowVisible: user32.func('BOOL __stdcall IsWindowVisible(HWND hWnd)'),
        ShowWindow: user32.func('BOOL __stdcall ShowWindow(HWND hWnd, int nCmdShow)'),
        CreateToolhelp32Snapshot: kernel32.func('HANDLE __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)'),
        Process32First: kernel32.func('bool __stdcall Process32First(HANDLE hSnapshot, _Inout_ PROCESSENTRY32 *lppe)'),
        Process32Next: kernel32.func('bool __stdcall Process32Next(HANDLE hSnapshot, _Inout_ PROCESSENTRY32 *lppe)'),
        CloseHandle: kernel32.func('bool __stdcall CloseHandle(HANDLE hObject)'),
        EnumWindowsProc,
        PROCESSENTRY32,
        TH32CS_SNAPPROCESS
    };
    return api;
}

function hwndToNumber(hwnd) {
    if (typeof hwnd === 'bigint') return Number(hwnd);
    if (typeof hwnd === 'number') return hwnd;
    if (hwnd && typeof hwnd === 'object' && typeof hwnd.valueOf === 'function') {
        const value = hwnd.valueOf();
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'number') return value;
    }
    return Number(hwnd) || 0;
}

function getDescendantProcessIds(rootPids) {
    const roots = new Set((rootPids || []).map((pid) => Number(pid)).filter(Number.isFinite));
    if (roots.size === 0 || process.platform !== 'win32') return Array.from(roots);

    const native = getApi();
    if (!native) return Array.from(roots);

    const snapshot = native.CreateToolhelp32Snapshot(native.TH32CS_SNAPPROCESS, 0);
    if (!snapshot) return Array.from(roots);

    try {
        const pe32 = { dwSize: koffi.sizeof(native.PROCESSENTRY32) };
        const processes = [];
        let hasNext = native.Process32First(snapshot, pe32);
        while (hasNext) {
            processes.push({
                pid: Number(pe32.th32ProcessID),
                ppid: Number(pe32.th32ParentProcessID)
            });
            hasNext = native.Process32Next(snapshot, pe32);
        }

        let changed = true;
        while (changed) {
            changed = false;
            for (const proc of processes) {
                if (roots.has(proc.ppid) && !roots.has(proc.pid)) {
                    roots.add(proc.pid);
                    changed = true;
                }
            }
        }
    } finally {
        native.CloseHandle(snapshot);
    }
    return Array.from(roots);
}

function setWindowsVisibleForProcessIds(pids, visible, { hwndAllowList = null } = {}) {
    const targetPids = new Set((pids || []).map((pid) => Number(pid)).filter(Number.isFinite));
    const allowedHwnds = hwndAllowList ? new Set(hwndAllowList.map((hwnd) => Number(hwnd)).filter(Number.isFinite)) : null;
    const action = visible ? 'SHOW' : 'HIDE';

    if (process.platform !== 'win32') {
        return {
            success: false,
            action,
            matchedWindowCount: 0,
            affectedWindowCount: 0,
            errorCode: 'UNSUPPORTED_PLATFORM'
        };
    }
    if (targetPids.size === 0) {
        return {
            success: false,
            action,
            matchedWindowCount: 0,
            affectedWindowCount: 0,
            errorCode: 'NO_PROCESS_IDS'
        };
    }

    const native = getApi();
    const showCommand = visible ? 5 : 0; // SW_SHOW / SW_HIDE
    const windows = [];
    let affectedWindowCount = 0;
    let matchedWindowCount = 0;

    const callback = (hwnd) => {
        const outPid = [0];
        const threadId = native.GetWindowThreadProcessId(hwnd, outPid);
        const ownerPid = Number(outPid[0]);
        if (!threadId || !targetPids.has(ownerPid)) return true;
        const hwndNumber = hwndToNumber(hwnd);
        if (allowedHwnds && !allowedHwnds.has(hwndNumber)) return true;

        const wasVisible = Boolean(native.IsWindowVisible(hwnd));
        
        // Skip already-hidden windows ONLY for HIDE operation
        if (!visible && !wasVisible) {
            return true;
        }

        matchedWindowCount += 1;

        const nativeResult = Boolean(native.ShowWindow(hwnd, showCommand));
        const isVisible = Boolean(native.IsWindowVisible(hwnd));
        const changedToTarget = wasVisible !== isVisible && (visible ? isVisible : !isVisible);
        if (changedToTarget) affectedWindowCount += 1;

        windows.push({
            hwnd: hwndNumber,
            pid: ownerPid,
            wasVisible,
            isVisible,
            nativeResult,
            alreadyInTargetState: visible ? wasVisible : !wasVisible
        });
        return true;
    };

    native.EnumWindows(callback, 0);

    return {
        success: affectedWindowCount > 0 || matchedWindowCount === 0, 
        // Note: browserProcessManager will decide success criteria. 
        // Here we just return what we did.
        action,
        matchedWindowCount,
        affectedWindowCount,
        windows
    };
}

module.exports = {
    getDescendantProcessIds,
    setWindowsVisibleForProcessIds
};

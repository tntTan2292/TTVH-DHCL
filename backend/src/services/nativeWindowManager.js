'use strict';

const koffi = require('koffi');

const user32 = process.platform === 'win32' ? koffi.load('user32.dll') : null;

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

    api = {
        EnumWindows: user32.func('BOOL __stdcall EnumWindows(EnumWindowsProc *lpEnumFunc, LPARAM lParam)'),
        GetWindowThreadProcessId: user32.func('DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ DWORD *lpdwProcessId)'),
        IsWindowVisible: user32.func('BOOL __stdcall IsWindowVisible(HWND hWnd)'),
        ShowWindow: user32.func('BOOL __stdcall ShowWindow(HWND hWnd, int nCmdShow)'),
        EnumWindowsProc
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

    const callback = (hwnd) => {
        const outPid = [0];
        const threadId = native.GetWindowThreadProcessId(hwnd, outPid);
        const ownerPid = Number(outPid[0]);
        if (!threadId || !targetPids.has(ownerPid)) return true;
        const hwndNumber = hwndToNumber(hwnd);
        if (allowedHwnds && !allowedHwnds.has(hwndNumber)) return true;

        const wasVisible = Boolean(native.IsWindowVisible(hwnd));
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
        success: affectedWindowCount > 0,
        action,
        matchedWindowCount: windows.length,
        affectedWindowCount,
        windows
    };
}

module.exports = {
    setWindowsVisibleForProcessIds
};

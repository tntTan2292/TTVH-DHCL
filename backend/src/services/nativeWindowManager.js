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
    const RECT = koffi.struct('RECT', {
        left: 'int32_t',
        top: 'int32_t',
        right: 'int32_t',
        bottom: 'int32_t'
    });
    const WINDOWPLACEMENT = koffi.struct('WINDOWPLACEMENT', {
        length: 'uint32_t',
        flags: 'uint32_t',
        showCmd: 'uint32_t',
        ptMinPositionX: 'int32_t',
        ptMinPositionY: 'int32_t',
        ptMaxPositionX: 'int32_t',
        ptMaxPositionY: 'int32_t',
        rcNormalLeft: 'int32_t',
        rcNormalTop: 'int32_t',
        rcNormalRight: 'int32_t',
        rcNormalBottom: 'int32_t'
    });
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
        IsIconic: user32.func('BOOL __stdcall IsIconic(HWND hWnd)'),
        IsZoomed: user32.func('BOOL __stdcall IsZoomed(HWND hWnd)'),
        GetWindowRect: user32.func('BOOL __stdcall GetWindowRect(HWND hWnd, _Out_ RECT *lpRect)'),
        GetWindowPlacement: user32.func('BOOL __stdcall GetWindowPlacement(HWND hWnd, _Inout_ WINDOWPLACEMENT *lpwndpl)'),
        GetClassNameW: user32.func('int __stdcall GetClassNameW(HWND hWnd, _Out_ uint16_t *lpClassName, int nMaxCount)'),
        GetWindowTextW: user32.func('int __stdcall GetWindowTextW(HWND hWnd, _Out_ uint16_t *lpString, int nMaxCount)'),
        GetForegroundWindow: user32.func('HWND __stdcall GetForegroundWindow()'),
        AttachThreadInput: user32.func('BOOL __stdcall AttachThreadInput(DWORD idAttach, DWORD idAttachTo, BOOL fAttach)'),
        BringWindowToTop: user32.func('BOOL __stdcall BringWindowToTop(HWND hWnd)'),
        SetForegroundWindow: user32.func('BOOL __stdcall SetForegroundWindow(HWND hWnd)'),
        SetActiveWindow: user32.func('HWND __stdcall SetActiveWindow(HWND hWnd)'),
        SetFocus: user32.func('HWND __stdcall SetFocus(HWND hWnd)'),
        SetWindowPos: user32.func('BOOL __stdcall SetWindowPos(HWND hWnd, HWND hWndInsertAfter, int X, int Y, int cx, int cy, unsigned int uFlags)'),
        SwitchToThisWindow: user32.func('void __stdcall SwitchToThisWindow(HWND hWnd, BOOL fAltTab)'),
        ShowWindow: user32.func('BOOL __stdcall ShowWindow(HWND hWnd, int nCmdShow)'),
        GetCurrentThreadId: kernel32.func('DWORD __stdcall GetCurrentThreadId()'),
        CreateToolhelp32Snapshot: kernel32.func('HANDLE __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)'),
        Process32First: kernel32.func('bool __stdcall Process32First(HANDLE hSnapshot, _Inout_ PROCESSENTRY32 *lppe)'),
        Process32Next: kernel32.func('bool __stdcall Process32Next(HANDLE hSnapshot, _Inout_ PROCESSENTRY32 *lppe)'),
        CloseHandle: kernel32.func('bool __stdcall CloseHandle(HANDLE hObject)'),
        EnumWindowsProc,
        RECT,
        WINDOWPLACEMENT,
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

function readWideString(buffer) {
    const chars = [];
    for (let i = 0; i < buffer.length; i += 1) {
        if (!buffer[i]) break;
        chars.push(buffer[i]);
    }
    return Buffer.from(Uint16Array.from(chars).buffer).toString('utf16le').replace(/\0+$/, '');
}

function describeWindow(native, hwnd, ownerPid) {
    const rect = { left: 0, top: 0, right: 0, bottom: 0 };
    native.GetWindowRect(hwnd, rect);
    const width = Math.max(0, Number(rect.right) - Number(rect.left));
    const height = Math.max(0, Number(rect.bottom) - Number(rect.top));
    const classBuffer = new Uint16Array(256);
    const titleBuffer = new Uint16Array(1024);
    native.GetClassNameW(hwnd, classBuffer, classBuffer.length);
    native.GetWindowTextW(hwnd, titleBuffer, titleBuffer.length);
    const className = readWideString(classBuffer);
    const title = readWideString(titleBuffer);
    const placement = {
        length: koffi.sizeof(native.WINDOWPLACEMENT),
        flags: 0,
        showCmd: 0,
        ptMinPositionX: 0,
        ptMinPositionY: 0,
        ptMaxPositionX: 0,
        ptMaxPositionY: 0,
        rcNormalLeft: 0,
        rcNormalTop: 0,
        rcNormalRight: 0,
        rcNormalBottom: 0
    };
    native.GetWindowPlacement(hwnd, placement);

    return {
        hwnd: hwndToNumber(hwnd),
        pid: ownerPid,
        className,
        title,
        width,
        height,
        wasVisible: Boolean(native.IsWindowVisible(hwnd)),
        minimized: Boolean(native.IsIconic(hwnd)),
        maximized: Boolean(native.IsZoomed(hwnd)),
        showCmd: Number(placement.showCmd),
        rect
    };
}

function isPrimaryChromeWindow(windowInfo) {
    return /^Chrome_WidgetWin_/i.test(windowInfo.className || '') &&
        (windowInfo.width > 400 && windowInfo.height > 300);
}

function choosePrimaryWindow(windows) {
    const primaryCandidates = (windows || []).filter(isPrimaryChromeWindow);
    if (primaryCandidates.length === 0) return null;
    return primaryCandidates.sort((a, b) => {
        const areaDiff = (b.width * b.height) - (a.width * a.height);
        if (areaDiff !== 0) return areaDiff;
        if (b.title && !a.title) return 1;
        if (a.title && !b.title) return -1;
        return a.hwnd - b.hwnd;
    })[0];
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
    const HWND_TOPMOST = -1;
    const HWND_NOTOPMOST = -2;
    const SW_HIDE = 0;
    const SW_SHOW = 5;
    const SW_RESTORE = 9;
    const SWP_NOMOVE = 0x0002;
    const SWP_NOSIZE = 0x0001;
    const SWP_SHOWWINDOW = 0x0040;
    const showCommand = visible ? SW_RESTORE : SW_HIDE;
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
        const windowInfo = describeWindow(native, hwnd, ownerPid);
        const { width, height } = windowInfo;
        const isUsableWindow = width > 0 && height > 0;
        if (!isUsableWindow) return true;
        const wasVisible = windowInfo.wasVisible;
        const alreadyInTargetState = visible ? (wasVisible && !windowInfo.minimized) : !wasVisible;

        let nativeResult = true;
        let isVisible = wasVisible;

        if (!alreadyInTargetState) {
            matchedWindowCount += 1;
            nativeResult = Boolean(native.ShowWindow(hwnd, showCommand));
            isVisible = Boolean(native.IsWindowVisible(hwnd));
            const changedToTarget = wasVisible !== isVisible && (visible ? isVisible : !isVisible);
            if (changedToTarget) affectedWindowCount += 1;
        }

        windows.push({ ...windowInfo, isVisible, nativeResult, alreadyInTargetState });
        return true;
    };

    native.EnumWindows(callback, 0);

    const primaryWindow = choosePrimaryWindow(windows);
    let focusActions = null;
    if (visible && primaryWindow) {
        const primaryHwnd = BigInt(primaryWindow.hwnd);
        const foregroundHwnd = native.GetForegroundWindow();
        const currentThreadId = Number(native.GetCurrentThreadId());
        const foregroundPid = [0];
        const foregroundThreadId = foregroundHwnd ? Number(native.GetWindowThreadProcessId(foregroundHwnd, foregroundPid)) : 0;
        const primaryPid = [0];
        const primaryThreadId = Number(native.GetWindowThreadProcessId(primaryHwnd, primaryPid));
        let attachedToForeground = false;
        let attachedToPrimary = false;
        if (foregroundThreadId && foregroundThreadId !== currentThreadId) {
            attachedToForeground = Boolean(native.AttachThreadInput(currentThreadId, foregroundThreadId, true));
        }
        if (primaryThreadId && primaryThreadId !== currentThreadId) {
            attachedToPrimary = Boolean(native.AttachThreadInput(currentThreadId, primaryThreadId, true));
        }
        const topmostResult = Boolean(native.SetWindowPos(primaryHwnd, BigInt(HWND_TOPMOST), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW));
        const bringToTopResult = Boolean(native.BringWindowToTop(primaryHwnd));
        native.SwitchToThisWindow(primaryHwnd, true);
        const foregroundResult = Boolean(native.SetForegroundWindow(primaryHwnd));
        const activeResult = hwndToNumber(native.SetActiveWindow(primaryHwnd));
        const focusResult = hwndToNumber(native.SetFocus(primaryHwnd));
        const notTopmostResult = foregroundResult
            ? Boolean(native.SetWindowPos(primaryHwnd, BigInt(HWND_NOTOPMOST), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW))
            : false;
        const finalForegroundHwnd = hwndToNumber(native.GetForegroundWindow());
        if (attachedToPrimary) {
            native.AttachThreadInput(currentThreadId, primaryThreadId, false);
        }
        if (attachedToForeground) {
            native.AttachThreadInput(currentThreadId, foregroundThreadId, false);
        }
        focusActions = {
            hwnd: primaryWindow.hwnd,
            foregroundHwnd: hwndToNumber(foregroundHwnd),
            foregroundThreadId,
            primaryThreadId,
            attachedToForeground,
            attachedToPrimary,
            topmostResult,
            notTopmostResult,
            keptTopmost: topmostResult && !foregroundResult,
            switchToThisWindowInvoked: true,
            bringToTopResult,
            foregroundResult,
            finalForegroundHwnd,
            activeResult,
            focusResult
        };
    }

    const finalWindows = visible && primaryWindow
        ? windows.map((windowInfo) => windowInfo.hwnd === primaryWindow.hwnd
            ? { ...describeWindow(native, BigInt(windowInfo.hwnd), windowInfo.pid), nativeResult: windowInfo.nativeResult, alreadyInTargetState: windowInfo.alreadyInTargetState }
            : windowInfo)
        : windows;

    const finalPrimaryWindow = primaryWindow
        ? finalWindows.find((windowInfo) => windowInfo.hwnd === primaryWindow.hwnd) || primaryWindow
        : null;
    const success = visible
        ? Boolean(finalPrimaryWindow && finalPrimaryWindow.isVisible !== false && !finalPrimaryWindow.minimized)
        : (finalWindows.length > 0 && finalWindows.every((windowInfo) => windowInfo.isVisible === false));

    return {
        success,
        action,
        matchedWindowCount,
        affectedWindowCount,
        primaryWindowHwnd: primaryWindow?.hwnd || null,
        focusActions,
        windows: finalWindows
    };
}

module.exports = {
    getDescendantProcessIds,
    setWindowsVisibleForProcessIds
};

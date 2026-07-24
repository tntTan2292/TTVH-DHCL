const koffi = require('koffi');
const user32 = koffi.load('user32.dll');
const EnumWindowsProc = koffi.proto('BOOL __stdcall EnumWindowsProc(HWND hWnd, LPARAM lParam)');
const EnumWindows = user32.func('BOOL __stdcall EnumWindows(EnumWindowsProc *lpEnumFunc, LPARAM lParam)');
const GetWindowThreadProcessId = user32.func('DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ DWORD *lpdwProcessId)');
const GetWindowTextA = user32.func('int __stdcall GetWindowTextA(HWND hWnd, _Out_ char* lpString, int nMaxCount)');

const cb = (hwnd) => {
    const outPid = [0];
    GetWindowThreadProcessId(hwnd, outPid);
    const pid = Number(outPid[0]);
    const titleBuf = Buffer.alloc(256);
    GetWindowTextA(hwnd, titleBuf, 256);
    const title = titleBuf.toString('utf8').replace(/\0/g, '').trim();
    if (title.length > 0) {
        console.log(`HWND: ${hwnd}, PID: ${pid}, Title: ${title}`);
    }
    return true;
};
console.log('Enumerating windows...');
EnumWindows(cb, 0);

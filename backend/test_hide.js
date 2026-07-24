const koffi = require('koffi');
const user32 = koffi.load('user32.dll');
const EnumWindowsProc = koffi.proto('BOOL __stdcall EnumWindowsProc(HWND hWnd, LPARAM lParam)');
const EnumWindows = user32.func('BOOL __stdcall EnumWindows(EnumWindowsProc *lpEnumFunc, LPARAM lParam)');
const GetWindowThreadProcessId = user32.func('DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ DWORD *lpdwProcessId)');
const IsWindowVisible = user32.func('BOOL __stdcall IsWindowVisible(HWND hWnd)');
const ShowWindow = user32.func('BOOL __stdcall ShowWindow(HWND hWnd, int nCmdShow)');
const GetWindowTextA = user32.func('int __stdcall GetWindowTextA(HWND hWnd, _Out_ char* lpString, int nMaxCount)');
const GetClassNameA = user32.func('int __stdcall GetClassNameA(HWND hWnd, _Out_ char* lpString, int nMaxCount)');

const cp = require('child_process');

(async () => {
    let pw;
    try { pw = require('playwright'); } catch (e) { pw = require('playwright-core'); }
    console.log('Launching browser...');
    const browser = await pw.chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('about:blank');
    
    const stdout = cp.execSync('wmic process get ProcessId,ParentProcessId').toString();
    const processes = stdout.split('\n').map(line => line.trim().split(/\s+/)).filter(p => p.length === 2 && !isNaN(p[0]));
    let browserPid = browser.process().pid;
    console.log('Browser PID:', browserPid);
    
    const roots = new Set([browserPid]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const [parent, pid] of processes) {
            const ppid = Number(parent);
            const id = Number(pid);
            if (roots.has(ppid) && !roots.has(id)) {
                roots.add(id);
                changed = true;
            }
        }
    }
    
    setTimeout(() => {
        console.log('Hiding...');
        const cb = (hwnd) => {
            const outPid = [0];
            GetWindowThreadProcessId(hwnd, outPid);
            const pid = Number(outPid[0]);
            if (roots.has(pid)) {
                const titleBuf = Buffer.alloc(256);
                GetWindowTextA(hwnd, titleBuf, 256);
                const title = titleBuf.toString('utf8').replace(/\0/g, '').trim();
                
                const classBuf = Buffer.alloc(256);
                GetClassNameA(hwnd, classBuf, 256);
                const cls = classBuf.toString('utf8').replace(/\0/g, '').trim();

                const isVisible = IsWindowVisible(hwnd);
                
                console.log(`HWND: ${hwnd}, PID: ${pid}, Visible: ${isVisible}, Class: ${cls}, Title: ${title}`);
                if (isVisible) {
                    ShowWindow(hwnd, 0); // SW_HIDE
                    console.log(' -> Hid window');
                }
            }
            return true;
        };
        EnumWindows(cb, 0);
        
        setTimeout(() => {
            console.log('Closing browser...');
            browser.close();
        }, 3000);
    }, 2000);
})();

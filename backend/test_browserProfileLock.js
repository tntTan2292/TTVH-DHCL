'use strict';

const assert = require('assert/strict');
const { BrowserProcessManager, extractUserDataDir } = require('./src/services/browserProcessManager');

function createProcessEnumerator(processes, shouldThrow = false) {
    return () => {
        if (shouldThrow) throw new Error('PROCESS_INSPECTION_FAILED');
        return processes;
    };
}

async function runTests() {
    console.log('--- TEST 1: process inspection failure is reported distinctly ---');
    const failMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator([], true)
    });
    const failRes = await failMgr.findBrowserProcessByProfile('test_dir');
    assert.strictEqual(failRes.inspectionStatus, 'FAILED');
    assert.strictEqual(failRes.errorCode, 'PROCESS_INSPECTION_FAILED');
    console.log('PASS');

    console.log('--- TEST 2: stale lock cleanup still works ---');
    let rmCalled = false;
    const staleMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator([]),
        existsSync: () => true,
        rmSync: () => { rmCalled = true; }
    });
    staleMgr.cleanupStaleLocks('test_dir');
    assert.strictEqual(rmCalled, true);
    console.log('PASS');

    console.log('--- TEST 3: extractor supports observed user-data-dir forms with spaces ---');
    const realTctProfile = 'D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\TCT';
    const realHueProfile = 'D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\HUE\\';
    const quotedWholeArg = 'C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe --disable-sync --no-sandbox "--user-data-dir=D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\TCT" --remote-debugging-pipe about:blank';
    const bareSeparatedArg = 'chrome.exe --user-data-dir "D:/Antigravity - Project/TTVH - He thong dieu hanh chat luong/Data DKCL/BrowserProfiles/HUE"';
    assert.strictEqual(extractUserDataDir(quotedWholeArg), realTctProfile);
    assert.strictEqual(extractUserDataDir(bareSeparatedArg), 'D:/Antigravity - Project/TTVH - He thong dieu hanh chat luong/Data DKCL/BrowserProfiles/HUE');
    console.log('PASS');

    console.log('--- TEST 4: exact profile matching keeps root and child PIDs while excluding unrelated Chromium ---');
    const processes = [
        {
            ProcessId: 18240,
            ParentProcessId: 100,
            Name: 'chrome.exe',
            ExecutablePath: 'C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
            CommandLine: quotedWholeArg
        },
        {
            ProcessId: 20580,
            ParentProcessId: 18240,
            Name: 'chrome.exe',
            ExecutablePath: 'C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
            CommandLine: '"C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe" --type=gpu-process --user-data-dir="D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\TCT"'
        },
        {
            ProcessId: 12588,
            ParentProcessId: 100,
            Name: 'chrome.exe',
            ExecutablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            CommandLine: '--user-data-dir="D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\HUE"'
        },
        {
            ProcessId: 30000,
            ParentProcessId: 100,
            Name: 'chrome.exe',
            ExecutablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            CommandLine: '--user-data-dir="D:\\Some Other Workspace\\BrowserProfiles\\TCT"'
        }
    ];
    const fixtureMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator(processes),
        nativeWindows: {
            getDescendantProcessIds: async (rootPids) => rootPids[0] === 18240 ? [18240, 20580] : rootPids
        }
    });
    const tctFixtureRes = await fixtureMgr.findBrowserProcessByProfile(realTctProfile);
    assert.strictEqual(tctFixtureRes.inspectionStatus, 'SUCCESS');
    assert.deepStrictEqual(tctFixtureRes.matchingProcesses.map((proc) => proc.pid).sort((a, b) => a - b), [18240, 20580]);
    const tctFixtureTree = await fixtureMgr.getDescendantProcessIds([18240]);
    assert.deepStrictEqual(tctFixtureTree.sort((a, b) => a - b), [18240, 20580]);
    const hueFixtureRes = await fixtureMgr.findBrowserProcessByProfile(realHueProfile);
    assert.deepStrictEqual(hueFixtureRes.matchingProcesses.map((proc) => proc.pid), [12588]);
    assert(!tctFixtureRes.matchingProcesses.some((proc) => proc.pid === 12588 || proc.pid === 30000));
    console.log('PASS');

    console.log('--- TEST 5: native ownership restores unreadable browser root from matched child process ---');
    const unreadableRootMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator([
            {
                ProcessId: 9100,
                ParentProcessId: 100,
                Name: 'chrome.exe',
                ExecutablePath: 'C:\\Chrome\\chrome.exe',
                CommandLine: ''
            },
            {
                ProcessId: 9101,
                ParentProcessId: 9100,
                Name: 'chrome.exe',
                ExecutablePath: 'C:\\Chrome\\chrome.exe',
                CommandLine: '"C:\\Chrome\\chrome.exe" --type=renderer --user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"'
            }
        ]),
        nativeWindows: {
            getDescendantProcessIds: async (rootPids) => rootPids[0] === 9100 ? [9100, 9101] : rootPids,
            setWindowsVisibleForProcessIds: (pids, visible) => {
                assert.deepStrictEqual(pids.sort((a, b) => a - b), [9100, 9101]);
                assert.strictEqual(visible, false);
                return {
                    success: true,
                    action: 'HIDE',
                    matchedWindowCount: 1,
                    affectedWindowCount: 1,
                    windows: [{ hwnd: 501, pid: 9100, wasVisible: true, isVisible: false }]
                };
            }
        }
    });
    const unreadableRootInspection = await unreadableRootMgr.findBrowserProcessByProfile('D:\\Data DKCL\\BrowserProfiles\\TCT');
    assert.strictEqual(unreadableRootInspection.inspectionStatus, 'SUCCESS');
    assert.deepStrictEqual(
        unreadableRootInspection.matchingProcesses.map((proc) => proc.pid).sort((a, b) => a - b),
        [9100, 9101]
    );
    const unreadableRootHide = await unreadableRootMgr.setBrowserWindowsVisibleByProfile(
        'D:\\Data DKCL\\BrowserProfiles\\TCT',
        false,
        1,
        1
    );
    assert.deepStrictEqual(unreadableRootHide.rootPids, [9100]);
    console.log('PASS');

    console.log('--- TEST 6: no shell-string execution fallback exists in production lookup ---');
    const noShellMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator([
            { ProcessId: 9100, ParentProcessId: 100, Name: 'chrome.exe', ExecutablePath: 'C:\\Chrome\\chrome.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' }
        ]),
        execFileAsync: async () => {
            throw new Error('execFile should not be used for process inspection');
        }
    });
    const noShellRes = await noShellMgr.findBrowserProcessByProfile('D:\\Data DKCL\\BrowserProfiles\\TCT');
    assert.strictEqual(noShellRes.matchingProcesses[0].pid, 9100);
    console.log('PASS');

    console.log('--- TEST 7: HUE hide uses root browser PID and native window path only ---');
    const hueCalls = [];
    const hueMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator([
            { ProcessId: 5300, ParentProcessId: 100, Name: 'chromium.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\HUE"' },
            { ProcessId: 5301, ParentProcessId: 5300, Name: 'chromium.exe', CommandLine: '"chromium.exe" --type=renderer --user-data-dir="D:\\Data DKCL\\BrowserProfiles\\HUE"' },
            { ProcessId: 5400, ParentProcessId: 100, Name: 'chrome.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' }
        ]),
        nativeWindows: {
            getDescendantProcessIds: async (rootPids) => {
                hueCalls.push({ kind: 'tree', rootPids });
                return [5300, 5301];
            },
            setWindowsVisibleForProcessIds: (pids, visible) => {
                hueCalls.push({ kind: 'show', pids, visible });
                assert.deepStrictEqual(pids.sort((a, b) => a - b), [5300, 5301]);
                assert.strictEqual(visible, false);
                return {
                    success: true,
                    action: 'HIDE',
                    matchedWindowCount: 1,
                    affectedWindowCount: 1,
                    windows: [{ hwnd: 77, pid: 5301, wasVisible: true, isVisible: false, nativeResult: true }]
                };
            }
        }
    });
    const hueHide = await hueMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\HUE');
    assert.strictEqual(hueHide.success, true);
    assert.deepStrictEqual(hueHide.rootPids, [5300]);
    assert(hueHide.processIds.includes(5301));
    assert(!hueHide.processIds.includes(5400));
    assert(hueCalls.some((entry) => entry.kind === 'show'));
    console.log('PASS');

    console.log('--- TEST 8: TCT hide excludes HUE profile process ---');
    const tctMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator([
            { ProcessId: 5300, ParentProcessId: 100, Name: 'msedge.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\HUE"' },
            { ProcessId: 5400, ParentProcessId: 100, Name: 'playwright-chromium.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' },
            { ProcessId: 5401, ParentProcessId: 5400, Name: 'playwright-chromium.exe', CommandLine: '"playwright-chromium.exe" --type=renderer --user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' }
        ]),
        nativeWindows: {
            getDescendantProcessIds: async () => [5400, 5401],
            setWindowsVisibleForProcessIds: (pids, visible) => {
                assert.deepStrictEqual(pids.sort((a, b) => a - b), [5400, 5401]);
                assert.strictEqual(visible, false);
                return {
                    success: false,
                    action: 'HIDE',
                    matchedWindowCount: 1,
                    affectedWindowCount: 0,
                    windows: [{ hwnd: 88, pid: 5401, wasVisible: false, isVisible: false, nativeResult: true }]
                };
            }
        }
    });
    const tctHide = await tctMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\TCT');
    assert.strictEqual(tctHide.success, false);
    assert.deepStrictEqual(tctHide.rootPids, [5400]);
    assert(tctHide.processIds.includes(5401));
    assert(!tctHide.processIds.includes(5300));
    console.log('PASS');

    console.log('--- TEST 9: show retries until a usable browser window is visible ---');
    let showAttempts = 0;
    const showRetryMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator([
            { ProcessId: 8100, ParentProcessId: 100, Name: 'chrome.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' }
        ]),
        nativeWindows: {
            getDescendantProcessIds: async () => [8100],
            setWindowsVisibleForProcessIds: (pids, visible) => {
                assert.deepStrictEqual(pids, [8100]);
                assert.strictEqual(visible, true);
                showAttempts += 1;
                if (showAttempts === 1) {
                    return {
                        success: false,
                        action: 'SHOW',
                        matchedWindowCount: 1,
                        affectedWindowCount: 0,
                        windows: [{ hwnd: 3001, pid: 8100, width: 0, height: 0, wasVisible: false, isVisible: false }]
                    };
                }
                return {
                    success: true,
                    action: 'SHOW',
                    matchedWindowCount: 1,
                    affectedWindowCount: 1,
                    windows: [{ hwnd: 3002, pid: 8100, width: 1280, height: 720, wasVisible: false, isVisible: true }]
                };
            }
        }
    });
    const showRetryResult = await showRetryMgr.showBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\TCT');
    assert.strictEqual(showRetryResult.success, true);
    assert.strictEqual(showRetryResult.attempts, 2);
    assert.strictEqual(showAttempts, 2);
    console.log('PASS');

    console.log('--- TEST 10: restore only re-shows HWNDs hidden by this profile manager ---');
    const restoreCalls = [];
    const restoreMgr = new BrowserProcessManager({
        processEnumerator: createProcessEnumerator([
            { ProcessId: 7100, ParentProcessId: 100, Name: 'chrome.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\HUE"' },
            { ProcessId: 7101, ParentProcessId: 7100, Name: 'chrome.exe', CommandLine: '"chrome.exe" --type=renderer --user-data-dir="D:\\Data DKCL\\BrowserProfiles\\HUE"' }
        ]),
        nativeWindows: {
            getDescendantProcessIds: async () => [7100, 7101],
            setWindowsVisibleForProcessIds: (pids, visible, options = {}) => {
                restoreCalls.push({ pids, visible, options });
                if (!visible) {
                    return {
                        success: true,
                        action: 'HIDE',
                        matchedWindowCount: 2,
                        affectedWindowCount: 1,
                        windows: [
                            { hwnd: 2001, pid: 7101, wasVisible: true, isVisible: false },
                            { hwnd: 2002, pid: 7101, wasVisible: false, isVisible: false }
                        ]
                    };
                }
                assert.deepStrictEqual(options.hwndAllowList, [2001]);
                return {
                    success: true,
                    action: 'SHOW',
                    matchedWindowCount: 1,
                    affectedWindowCount: 1,
                    windows: [{ hwnd: 2001, pid: 7101, wasVisible: false, isVisible: true }]
                };
            }
        }
    });
    await restoreMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\HUE');
    const restored = await restoreMgr.showBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\HUE');
    assert.strictEqual(restored.success, true);
    assert.strictEqual(restoreCalls.length, 2);
    console.log('PASS');

    console.log('All tests passed.');
}

runTests().catch((err) => {
    console.error(err);
    process.exit(1);
});

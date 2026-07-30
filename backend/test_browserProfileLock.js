'use strict';

const assert = require('assert/strict');
const { BrowserProcessManager, extractUserDataDir } = require('./src/services/browserProcessManager');

function createMockExecFileAsync(mockResult, shouldThrow = false) {
    return async () => {
        if (shouldThrow) throw new Error('Mock exec error');
        return { stdout: mockResult };
    };
}

async function runTests() {
    console.log('--- TEST 1: inspection failure returns FAILED ---');
    const failMgr = new BrowserProcessManager({
        execFileAsync: createMockExecFileAsync('', true)
    });
    const failRes = await failMgr.findBrowserProcessByProfile('test_dir');
    assert.strictEqual(failRes.inspectionStatus, 'FAILED');
    console.log('PASS');

    console.log('--- TEST 2: malformed CIM JSON returns AMBIGUOUS ---');
    const parseFailMgr = new BrowserProcessManager({
        execFileAsync: async (file) => {
            if (file.toLowerCase() === 'powershell.exe') {
                return { stdout: 'invalid json' };
            }
            return { stdout: '' };
        }
    });
    const parseFailRes = await parseFailMgr.findBrowserProcessByProfile('test_dir');
    assert.strictEqual(parseFailRes.inspectionStatus, 'AMBIGUOUS');
    console.log('PASS');

    console.log('--- TEST 3: stale lock cleanup still works ---');
    let rmCalled = false;
    const staleMgr = new BrowserProcessManager({
        execFileAsync: createMockExecFileAsync(''),
        existsSync: () => true,
        rmSync: () => { rmCalled = true; }
    });
    staleMgr.cleanupStaleLocks('test_dir');
    assert.strictEqual(rmCalled, true);
    console.log('PASS');

    console.log('--- TEST 4: exact-profile process match succeeds ---');
    const liveMgr = new BrowserProcessManager({
        execFileAsync: async (file, args) => {
            const commandText = `${file} ${args.join(' ')}`;
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes('Where-Object CommandLine -Match')) {
                return {
                    stdout: JSON.stringify([{
                        ProcessId: 1234,
                        Name: 'chromium.exe',
                        ExecutablePath: 'C:\\Playwright\\chromium.exe',
                        CommandLine: '--user-data-dir="test_dir"'
                    }])
                };
            }
            throw new Error(`Unexpected command: ${commandText}`);
        }
    });
    const liveRes = await liveMgr.findBrowserProcessByProfile('test_dir');
    assert.strictEqual(liveRes.inspectionStatus, 'SUCCESS');
    assert.strictEqual(liveRes.matchingProcesses.length, 1);
    assert.strictEqual(liveRes.matchingProcesses[0].pid, 1234);
    console.log('PASS');

    console.log('--- TEST 5: observed TCT command-line shape resolves real root and children only ---');
    const realTctProfile = 'D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\TCT';
    const realHueProfile = 'D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\HUE\\';
    const quotedWholeArg = 'C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe --disable-sync --no-sandbox "--user-data-dir=D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\TCT" --remote-debugging-pipe about:blank';
    const bareSeparatedArg = 'chrome.exe --user-data-dir "D:/Antigravity - Project/TTVH - He thong dieu hanh chat luong/Data DKCL/BrowserProfiles/HUE"';
    assert.strictEqual(extractUserDataDir(quotedWholeArg), realTctProfile);
    assert.strictEqual(extractUserDataDir(bareSeparatedArg), 'D:/Antigravity - Project/TTVH - He thong dieu hanh chat luong/Data DKCL/BrowserProfiles/HUE');

    const fixtureMgr = new BrowserProcessManager({
        nativeWindows: {
            getDescendantProcessIds: async (rootPids) => rootPids[0] === 18240 ? [18240, 20580] : rootPids
        },
        execFileAsync: async (file, args) => {
            const commandText = `${file} ${args.join(' ')}`;
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes("Where-Object CommandLine -Match '--user-data-dir'")) {
                return {
                    stdout: JSON.stringify([
                        {
                            ProcessId: 18240,
                            Name: 'chrome.exe',
                            ExecutablePath: 'C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
                            CommandLine: quotedWholeArg
                        },
                        {
                            ProcessId: 20580,
                            Name: 'chrome.exe',
                            ExecutablePath: 'C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe',
                            CommandLine: '"C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe" --type=gpu-process --user-data-dir="D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\TCT"'
                        },
                        {
                            ProcessId: 12588,
                            Name: 'chrome.exe',
                            ExecutablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                            CommandLine: '--user-data-dir="D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\Data DKCL\\BrowserProfiles\\HUE"'
                        },
                        {
                            ProcessId: 30000,
                            Name: 'chrome.exe',
                            ExecutablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                            CommandLine: '--user-data-dir="D:\\Some Other Workspace\\BrowserProfiles\\TCT"'
                        }
                    ])
                };
            }
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes('Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 18240, ParentProcessId: 100 },
                        { ProcessId: 20580, ParentProcessId: 18240 },
                        { ProcessId: 12588, ParentProcessId: 100 },
                        { ProcessId: 30000, ParentProcessId: 100 }
                    ])
                };
            }
            throw new Error(`Unexpected command: ${commandText}`);
        }
    });
    const tctFixtureRes = await fixtureMgr.findBrowserProcessByProfile(realTctProfile);
    assert.strictEqual(tctFixtureRes.inspectionStatus, 'SUCCESS');
    assert.deepStrictEqual(tctFixtureRes.matchingProcesses.map((proc) => proc.pid).sort((a, b) => a - b), [18240, 20580]);
    const tctFixtureTree = await fixtureMgr.getDescendantProcessIds([18240]);
    assert(tctFixtureTree.includes(20580));
    const hueFixtureRes = await fixtureMgr.findBrowserProcessByProfile(realHueProfile);
    assert.deepStrictEqual(hueFixtureRes.matchingProcesses.map((proc) => proc.pid), [12588]);
    assert(!tctFixtureRes.matchingProcesses.some((proc) => proc.pid === 12588 || proc.pid === 30000));
    console.log('PASS');

    console.log('--- TEST 6: direct process invocation never uses cmd.exe ---');
    const invocationLog = [];
    const directExecMgr = new BrowserProcessManager({
        execFileAsync: async (file, args, options) => {
            invocationLog.push({ file, args, options });
            return {
                stdout: JSON.stringify([
                    { ProcessId: 9100, Name: 'chrome.exe', ExecutablePath: 'C:\\Chrome\\chrome.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' }
                ])
            };
        }
    });
    const directResult = await directExecMgr.findBrowserProcessByProfile('D:\\Data DKCL\\BrowserProfiles\\TCT');
    assert.strictEqual(directResult.matchingProcesses[0].pid, 9100);
    assert.strictEqual(invocationLog.length, 1);
    assert.strictEqual(invocationLog[0].file.toLowerCase(), 'powershell.exe');
    assert.deepStrictEqual(invocationLog[0].args.slice(0, 2), ['-NoProfile', '-Command']);
    assert.strictEqual(invocationLog[0].options.shell, false);
    assert(!invocationLog.some((entry) => entry.file.toLowerCase() === 'cmd.exe'));
    console.log('PASS');

    console.log('--- TEST 7: HUE hide uses exact profile ownership and native window path ---');
    const hueCalls = [];
    const hueMgr = new BrowserProcessManager({
        nativeWindows: {
            setWindowsVisibleForProcessIds: (pids, visible) => {
                hueCalls.push({ file: 'native:setWindowsVisibleForProcessIds', pids, visible });
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
        },
        execFileAsync: async (file, args) => {
            const commandText = `${file} ${args.join(' ')}`;
            hueCalls.push({ file, args });
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes("Where-Object CommandLine -Match '--user-data-dir'")) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, Name: 'chromium.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\HUE"' },
                        { ProcessId: 5400, Name: 'chrome.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' }
                    ])
                };
            }
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes('Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, ParentProcessId: 100 },
                        { ProcessId: 5301, ParentProcessId: 5300 },
                        { ProcessId: 5400, ParentProcessId: 100 }
                    ])
                };
            }
            throw new Error(`Unexpected command: ${commandText}`);
        }
    });
    const hueHide = await hueMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\HUE');
    assert.strictEqual(hueHide.success, true);
    assert.deepStrictEqual(hueHide.rootPids, [5300]);
    assert(hueHide.processIds.includes(5301));
    assert(!hueHide.processIds.includes(5400));
    assert(hueCalls.some((entry) => entry.file === 'native:setWindowsVisibleForProcessIds'));
    assert(!hueCalls.some((entry) => entry.file.toLowerCase && entry.file.toLowerCase() === 'cmd.exe'));
    console.log('PASS');

    console.log('--- TEST 8: TCT hide excludes HUE profile process ---');
    const tctMgr = new BrowserProcessManager({
        nativeWindows: {
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
        },
        execFileAsync: async (file, args) => {
            const commandText = `${file} ${args.join(' ')}`;
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes("Where-Object CommandLine -Match '--user-data-dir'")) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, Name: 'msedge.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\HUE"' },
                        { ProcessId: 5400, Name: 'playwright-chromium.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' }
                    ])
                };
            }
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes('Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, ParentProcessId: 100 },
                        { ProcessId: 5400, ParentProcessId: 100 },
                        { ProcessId: 5401, ParentProcessId: 5400 }
                    ])
                };
            }
            throw new Error(`Unexpected command: ${commandText}`);
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
        nativeWindows: {
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
        },
        execFileAsync: async (file, args) => {
            const commandText = `${file} ${args.join(' ')}`;
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes("Where-Object CommandLine -Match '--user-data-dir'")) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 8100, Name: 'chrome.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\TCT"' }
                    ])
                };
            }
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes('Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId')) {
                return {
                    stdout: JSON.stringify([{ ProcessId: 8100, ParentProcessId: 100 }])
                };
            }
            throw new Error(`Unexpected command: ${commandText}`);
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
        nativeWindows: {
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
        },
        execFileAsync: async (file, args) => {
            const commandText = `${file} ${args.join(' ')}`;
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes("Where-Object CommandLine -Match '--user-data-dir'")) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 7100, Name: 'chrome.exe', CommandLine: '--user-data-dir="D:\\Data DKCL\\BrowserProfiles\\HUE"' }
                    ])
                };
            }
            if (file.toLowerCase() === 'powershell.exe' && commandText.includes('Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 7100, ParentProcessId: 100 },
                        { ProcessId: 7101, ParentProcessId: 7100 }
                    ])
                };
            }
            throw new Error(`Unexpected command: ${commandText}`);
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

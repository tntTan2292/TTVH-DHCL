'use strict';

const assert = require('assert/strict');
const path = require('path');
const { BrowserProcessManager } = require('./src/services/browserProcessManager');

// Fake execAsync for dependency injection
function createMockExecAsync(mockResult, shouldThrow = false) {
    return async (cmd) => {
        if (shouldThrow) throw new Error('Mock exec error');
        return { stdout: mockResult };
    };
}

async function runTests() {
    console.log('--- TEST 1: WMIC/CIM inspection failure ---');
    const failMgr = new BrowserProcessManager({
        execAsync: createMockExecAsync('', true)
    });
    const failRes = await failMgr.findBrowserProcessByProfile('test_dir');
    assert.strictEqual(failRes.inspectionStatus, 'FAILED');
    console.log('PASS');

    console.log('--- TEST 2: malformed process output ---');
    const parseFailMgr = new BrowserProcessManager({
        execAsync: createMockExecAsync('invalid json')
    });
    const parseFailRes = await parseFailMgr.findBrowserProcessByProfile('test_dir');
    // For win32 wmic fallback, invalid json is just a string without match, yielding SUCCESS + []
    // Wait, our new code uses CIM first, if parse error it returns AMBIGUOUS. Let's force CIM.
    // Actually, if we mock it, we are simulating CIM output. If it doesn't parse as JSON, and it goes to fallback, 
    // it will return SUCCESS + [].
    // Let's explicitly mock CIM failure if we want to test AMBIGUOUS.
    const strictMgr = new BrowserProcessManager({
        execAsync: async (cmd) => {
            if (cmd.includes('Get-CimInstance')) {
                return { stdout: 'not json' };
            }
            return { stdout: '' };
        }
    });
    const strictRes = await strictMgr.findBrowserProcessByProfile('test_dir');
    assert.strictEqual(strictRes.inspectionStatus, 'AMBIGUOUS');
    console.log('PASS');

    console.log('--- TEST 3: successful inspection with no process + stale lock ---');
    let rmCalled = false;
    const staleMgr = new BrowserProcessManager({
        execAsync: createMockExecAsync(''),
        existsSync: () => true,
        rmSync: () => { rmCalled = true; }
    });
    staleMgr.cleanupStaleLocks('test_dir');
    assert.strictEqual(rmCalled, true);
    console.log('PASS');

    console.log('--- TEST 4: live exact-profile process returns SUCCESS + processes ---');
    const liveMgr = new BrowserProcessManager({
        execAsync: async (cmd) => {
            if (cmd.includes('Get-CimInstance')) {
                return {
                    stdout: JSON.stringify([{
                        ProcessId: 1234,
                        Name: 'chromium.exe',
                        ExecutablePath: 'C:\\Playwright\\chromium.exe',
                        CommandLine: '--user-data-dir="test_dir"'
                    }])
                };
            }
        }
    });
    const liveRes = await liveMgr.findBrowserProcessByProfile('test_dir');
    assert.strictEqual(liveRes.inspectionStatus, 'SUCCESS');
    assert.strictEqual(liveRes.matchingProcesses.length, 1);
    assert.strictEqual(liveRes.matchingProcesses[0].pid, 1234);
    assert.strictEqual(liveRes.matchingProcesses[0].executable, 'chromium.exe');
    assert.strictEqual(liveRes.matchingProcesses[0].executablePath, 'C:\\Playwright\\chromium.exe');
    console.log('PASS');

    console.log('--- TEST 5: descendant process tree includes browser children ---');
    const treeMgr = new BrowserProcessManager({
        nativeWindows: {
            getDescendantProcessIds: async () => [100, 110, 111]
        },
        execAsync: async () => ({})
    });
    const descendants = await treeMgr.getDescendantProcessIds([100]);
    assert.deepStrictEqual(descendants.sort((a, b) => a - b), [100, 110, 111]);
    console.log('PASS');

    console.log('--- TEST 6: HUE native hide uses exact profile process ownership ---');
    const hueCommands = [];
    const hueMgr = new BrowserProcessManager({
        nativeWindows: {
            setWindowsVisibleForProcessIds: (pids, visible) => {
                hueCommands.push('native:setWindowsVisibleForProcessIds');
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
        execAsync: async (cmd) => {
            hueCommands.push(cmd);
            if (cmd.includes('CommandLine -match')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, Name: 'chromium.exe', CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\HUE"' },
                        { ProcessId: 5400, Name: 'chrome.exe', CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\TCT"' }
                    ])
                };
            }
            if (cmd.includes('Get-CimInstance Win32_Process | Select-Object ProcessId')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, ParentProcessId: 100 },
                        { ProcessId: 5301, ParentProcessId: 5300 },
                        { ProcessId: 5400, ParentProcessId: 100 }
                    ])
                };
            }
            throw new Error(`Unexpected command: ${cmd}`);
        }
    });
    const hueHide = await hueMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\HUE');
    assert.strictEqual(hueHide.success, true);
    assert.deepStrictEqual(hueHide.rootPids, [5300]);
    assert.strictEqual(hueHide.inspection.matchingProcesses[0].executable, 'chromium.exe');
    assert(hueHide.processIds.includes(5301), 'child window process is included');
    assert(!hueHide.processIds.includes(5400), 'TCT process is not included while hiding HUE');
    assert(hueCommands.includes('native:setWindowsVisibleForProcessIds'), 'native FFI ShowWindow path is used');
    assert(!hueCommands.some((cmd) => cmd.includes('-EncodedCommand')), 'PowerShell native bridge is not used');
    console.log('PASS');

    console.log('--- TEST 7: TCT native hide does not target HUE profile process ---');
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
        execAsync: async (cmd) => {
            if (cmd.includes('CommandLine -match')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, Name: 'msedge.exe', CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\HUE"' },
                        { ProcessId: 5400, Name: 'playwright-chromium.exe', CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\TCT"' }
                    ])
                };
            }
            if (cmd.includes('Get-CimInstance Win32_Process | Select-Object ProcessId')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, ParentProcessId: 100 },
                        { ProcessId: 5400, ParentProcessId: 100 },
                        { ProcessId: 5401, ParentProcessId: 5400 }
                    ])
                };
            }
            throw new Error(`Unexpected command: ${cmd}`);
        }
    });
    const tctHide = await tctMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\TCT');
    assert.strictEqual(tctHide.success, false, 'native failure is not marked successful');
    assert.deepStrictEqual(tctHide.rootPids, [5400]);
    assert.strictEqual(tctHide.inspection.matchingProcesses[0].executable, 'playwright-chromium.exe');
    assert(tctHide.processIds.includes(5401), 'TCT child window process is included');
    assert(!tctHide.processIds.includes(5300), 'HUE root process is not included while hiding TCT');
    console.log('PASS');

    console.log('--- TEST 8: no CDP window id to native HWND bridge is exported ---');
    const defaultManager = require('./src/services/browserProcessManager');
    assert.strictEqual(defaultManager.setWindowVisibleByHandleForProfile, undefined);
    assert.strictEqual(typeof defaultManager.hideBrowserWindowsByProfile, 'function');
    assert.strictEqual(typeof defaultManager.showBrowserWindowsByProfile, 'function');
    console.log('PASS');

    console.log('--- TEST 9: native success follows verified post-hide visibility ---');
    const postStateMgr = new BrowserProcessManager({
        nativeWindows: {
            setWindowsVisibleForProcessIds: () => ({
                success: true,
                action: 'HIDE',
                matchedWindowCount: 2,
                affectedWindowCount: 1,
                windows: [
                    { hwnd: 999, pid: 6101, wasVisible: true, isVisible: false, nativeResult: false },
                    { hwnd: 1000, pid: 6102, wasVisible: false, isVisible: false, nativeResult: true }
                ]
            })
        }
    });
    const postStateHide = await postStateMgr.setWindowsVisibleForProcessIds([6101, 6102], false);
    assert.strictEqual(postStateHide.success, true);
    assert.strictEqual(postStateHide.affectedWindowCount, 1);
    assert.strictEqual(postStateHide.windows[0].nativeResult, false);
    assert.strictEqual(postStateHide.windows[0].isVisible, false);
    console.log('PASS');

    console.log('--- TEST 10: hidden utility windows do not count as affected success ---');
    const utilityMgr = new BrowserProcessManager({
        nativeWindows: {
            setWindowsVisibleForProcessIds: () => ({
                success: false,
                action: 'HIDE',
                matchedWindowCount: 1,
                affectedWindowCount: 0,
                windows: [{ hwnd: 1001, pid: 6103, wasVisible: false, isVisible: false, nativeResult: true }]
            })
        }
    });
    const utilityHide = await utilityMgr.setWindowsVisibleForProcessIds([6103], false);
    assert.strictEqual(utilityHide.success, false);
    assert.strictEqual(utilityHide.affectedWindowCount, 0);
    console.log('PASS');

    console.log('--- TEST 11: restore only shows HWNDs hidden by this profile manager ---');
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
        execAsync: async (cmd) => {
            if (cmd.includes('CommandLine -match')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 7100, Name: 'chrome.exe', CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\HUE"' }
                    ])
                };
            }
            if (cmd.includes('Get-CimInstance Win32_Process | Select-Object ProcessId')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 7100, ParentProcessId: 100 },
                        { ProcessId: 7101, ParentProcessId: 7100 }
                    ])
                };
            }
            throw new Error(`Unexpected command: ${cmd}`);
        }
    });
    await restoreMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\HUE');
    const restored = await restoreMgr.showBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\HUE');
    assert.strictEqual(restored.success, true);
    assert.strictEqual(restoreCalls.length, 2);
    console.log('PASS');

    console.log('All tests passed.');
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});

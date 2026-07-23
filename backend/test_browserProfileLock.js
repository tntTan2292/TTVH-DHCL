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
    console.log('PASS');

    console.log('--- TEST 5: descendant process tree includes browser children ---');
    const treeMgr = new BrowserProcessManager({
        execAsync: async () => ({
            stdout: JSON.stringify([
                { ProcessId: 100, ParentProcessId: 1 },
                { ProcessId: 110, ParentProcessId: 100 },
                { ProcessId: 111, ParentProcessId: 110 },
                { ProcessId: 200, ParentProcessId: 1 }
            ])
        })
    });
    const descendants = await treeMgr.getDescendantProcessIds([100]);
    assert.deepStrictEqual(descendants.sort((a, b) => a - b), [100, 110, 111]);
    console.log('PASS');

    console.log('--- TEST 6: HUE native hide uses exact profile process ownership ---');
    const hueCommands = [];
    const hueMgr = new BrowserProcessManager({
        execAsync: async (cmd) => {
            hueCommands.push(cmd);
            if (cmd.includes('Get-CimInstance Win32_Process -Filter')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\HUE"' },
                        { ProcessId: 5400, CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\TCT"' }
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
            return {
                stdout: JSON.stringify({
                    success: true,
                    action: 'HIDE',
                    matchedWindowCount: 1,
                    affectedWindowCount: 1,
                    windows: [{ hwnd: 77, pid: 5301, isVisible: false }]
                })
            };
        }
    });
    const hueHide = await hueMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\HUE');
    assert.strictEqual(hueHide.success, true);
    assert.deepStrictEqual(hueHide.rootPids, [5300]);
    assert(hueHide.processIds.includes(5301), 'child window process is included');
    assert(!hueHide.processIds.includes(5400), 'TCT process is not included while hiding HUE');
    assert(hueCommands.some((cmd) => cmd.includes('-EncodedCommand')), 'native ShowWindow path is used');
    console.log('PASS');

    console.log('--- TEST 7: TCT native hide does not target HUE profile process ---');
    const tctMgr = new BrowserProcessManager({
        execAsync: async (cmd) => {
            if (cmd.includes('Get-CimInstance Win32_Process -Filter')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 5300, CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\HUE"' },
                        { ProcessId: 5400, CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\TCT"' }
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
            return {
                stdout: JSON.stringify({
                    success: false,
                    action: 'HIDE',
                    matchedWindowCount: 1,
                    affectedWindowCount: 0,
                    windows: [{ hwnd: 88, pid: 5401, isVisible: true }]
                })
            };
        }
    });
    const tctHide = await tctMgr.hideBrowserWindowsByProfile('D:\\Data DKCL\\BrowserProfiles\\TCT');
    assert.strictEqual(tctHide.success, false, 'native failure is not marked successful');
    assert.deepStrictEqual(tctHide.rootPids, [5400]);
    assert(tctHide.processIds.includes(5401), 'TCT child window process is included');
    assert(!tctHide.processIds.includes(5300), 'HUE root process is not included while hiding TCT');
    console.log('PASS');

    console.log('--- TEST 8: native handle hide verifies process ownership before ShowWindow ---');
    const handleMgr = new BrowserProcessManager({
        execAsync: async (cmd) => {
            if (cmd.includes('Get-CimInstance Win32_Process -Filter')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 6100, CommandLine: '--user-data-dir="D:\\\\Data DKCL\\\\BrowserProfiles\\\\HUE"' }
                    ])
                };
            }
            if (cmd.includes('Get-CimInstance Win32_Process | Select-Object ProcessId')) {
                return {
                    stdout: JSON.stringify([
                        { ProcessId: 6100, ParentProcessId: 100 },
                        { ProcessId: 6101, ParentProcessId: 6100 }
                    ])
                };
            }
            return {
                stdout: JSON.stringify({
                    success: true,
                    action: 'HIDE',
                    hwnd: 999,
                    pid: 6101,
                    owned: true,
                    wasVisible: true,
                    isVisible: false,
                    nativeResult: true
                })
            };
        }
    });
    const handleHide = await handleMgr.setWindowVisibleByHandleForProfile('D:\\Data DKCL\\BrowserProfiles\\HUE', 999, false);
    assert.strictEqual(handleHide.success, true);
    assert.strictEqual(handleHide.owned, true);
    assert.deepStrictEqual(handleHide.rootPids, [6100]);
    assert(handleHide.processIds.includes(6101), 'handle owner child process is included');
    console.log('PASS');

    console.log('All tests passed.');
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});

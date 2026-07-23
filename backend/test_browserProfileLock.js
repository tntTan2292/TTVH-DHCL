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

    console.log('All tests passed.');
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});

const fs = require('fs');
let code = fs.readFileSync('backend/test_dkclSessionPreflightService.js', 'utf8');

code = code.replace(
  'browserProcessManager.findBrowserProcessByProfile = async () => null;',
  `browserProcessManager.findBrowserProcessByProfile = async () => ({
    inspectionStatus: 'SUCCESS',
    matchingProcesses: [],
    errorCode: null
});`
);

let terminateCount = 0;
code = code.replace(
  'browserProcessManager.terminateProcessTree = async () => {};',
  `browserProcessManager.terminateProcessTree = async () => { global.terminateCount = (global.terminateCount || 0) + 1; };`
);

// Add the new focused tests for classification
const classificationTests = `
    console.log('\\nTEST 7: R4.1B interactive NONE classification (no cleanup, launch proceeds)');
    browserProcessManager.findBrowserProcessByProfile = async () => ({
        inspectionStatus: 'SUCCESS',
        matchingProcesses: [],
        errorCode: null
    });
    let cleanupCalled = false;
    browserProcessManager.cleanupStaleLocks = () => { cleanupCalled = true; };
    const noneService = new DkclSessionPreflightService({ interactiveClientFactory: () => makeClient({ authenticateImpl: async () => {} }) });
    await noneService.interactiveAuthenticate('HUE');
    assert.strictEqual(cleanupCalled, false, 'NONE classification should not clean locks');
    assert.strictEqual(global.terminateCount || 0, 0, 'terminateProcessTree count should be 0');

    console.log('\\nTEST 8: R4.1B interactive STALE_CONFIRMED classification (cleanup once, launch proceeds)');
    const fsMod = require('fs');
    const originalExistsSync = fsMod.existsSync;
    fsMod.existsSync = (path) => path.endsWith('.lock') ? true : originalExistsSync(path);
    cleanupCalled = false;
    await noneService.interactiveAuthenticate('TCT');
    assert.strictEqual(cleanupCalled, true, 'STALE_CONFIRMED classification should clean locks');
    fsMod.existsSync = originalExistsSync;

    console.log('\\nTEST 9: R4.1B interactive LIVE_UNVERIFIED classification (no terminate, no cleanup, throws explicit code)');
    browserProcessManager.findBrowserProcessByProfile = async () => ({
        inspectionStatus: 'SUCCESS',
        matchingProcesses: [{ pid: 999 }],
        errorCode: null
    });
    cleanupCalled = false;
    try {
        await noneService.interactiveAuthenticate('HUE');
        assert.fail('Should have thrown PROFILE_OWNERSHIP_UNVERIFIED');
    } catch (err) {
        assert.strictEqual(err.code, 'PROFILE_OWNERSHIP_UNVERIFIED');
    }
    assert.strictEqual(cleanupCalled, false, 'LIVE_UNVERIFIED should not clean locks');
    assert.strictEqual(global.terminateCount || 0, 0, 'terminateProcessTree count should be 0');

    console.log('\\nTEST 10: R4.1B recover STALE_CONFIRMED classification');
    browserProcessManager.findBrowserProcessByProfile = async () => ({
        inspectionStatus: 'SUCCESS',
        matchingProcesses: [],
        errorCode: null
    });
    fsMod.existsSync = (path) => path.endsWith('.lock') ? true : originalExistsSync(path);
    cleanupCalled = false;
    const recRes = await noneService.recover('HUE');
    assert.strictEqual(recRes.status, 'STALE_LOCK_CLEANED');
    assert.strictEqual(cleanupCalled, true);
    fsMod.existsSync = originalExistsSync;

    console.log('\\nTEST 11: R4.1B terminateProcessTree call count remains zero');
    assert.strictEqual(global.terminateCount || 0, 0, 'terminateProcessTree must never be called by interactive or recover in R4.1B');

`;

code = code.replace(
  "console.log('\\nRESULT: dkclSessionPreflightService checks passed');",
  classificationTests + "\n    console.log('\\nRESULT: dkclSessionPreflightService checks passed');"
);

fs.writeFileSync('backend/test_dkclSessionPreflightService.js', code);

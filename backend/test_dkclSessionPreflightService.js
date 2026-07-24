'use strict';

const assert = require('assert/strict');
const path = require('path');
const { DkclSessionPreflightService, PREFLIGHT_STATUSES, SOURCE_CONFIG, DKCL_LIFECYCLE_STATES, globalRegistry } = require('./src/services/dkclSessionPreflightService');
const { DKCL_PUBLIC_LIFECYCLE_SEQUENCE } = require('./src/services/dkclLifecycleContract');
const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const browserProcessManager = require('./src/services/browserProcessManager');

// Mock browserProcessManager for these tests to avoid real OS process calls
browserProcessManager.findBrowserProcessByProfile = async () => ({
    inspectionStatus: 'SUCCESS',
    matchingProcesses: [],
    errorCode: null
});
browserProcessManager.terminateProcessTree = async () => { global.terminateCount = (global.terminateCount || 0) + 1; };
browserProcessManager.cleanupStaleLocks = () => {};

function makeClient({ authenticateImpl, calls }) {
    return {
        async authenticate(args) {
            calls.push(['authenticate', args]);
            return authenticateImpl(args);
        },
        async close() {
            calls.push(['close']);
        }
    };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

(async () => {
    globalRegistry.clear();
    console.log('\nTEST 0: shared DKCL lifecycle contract sequence');
    assert.deepStrictEqual(DKCL_PUBLIC_LIFECYCLE_SEQUENCE, [
        'SOURCE_SELECTED',
        'SESSION_CHECK',
        'OPENING_BROWSER',
        'WAITING_FOR_LOGIN',
        'AUTHENTICATED',
        'F13_OPENING',
        'F13_READY'
    ]);

    console.log('\nTEST 1: Hue/TCT profile separation and background preflight');
    const calls = [];
    const service = new DkclSessionPreflightService({
        portalBaseUrl: 'https://dkcl.example/',
        portalClientFactory: (sourceConfig) => makeClient({
            calls,
            authenticateImpl: async (args) => {
                assert.strictEqual(args.requireExistingSession, true, 'preflight must require existing session only');
                assert(!args.username && !args.password, 'preflight must not pass credentials');
                assert(args.profileDir.includes(sourceConfig.source), 'profile path must be source-specific');
            }
        })
    });

    const hue = await service.preflight('HUE');
    const tct = await service.preflight('TCT');
    assert.strictEqual(hue.status, PREFLIGHT_STATUSES.SESSION_VALID, 'Hue valid profile returns SESSION_VALID');
    assert.strictEqual(tct.status, PREFLIGHT_STATUSES.SESSION_VALID, 'TCT valid profile returns SESSION_VALID');
    assert.strictEqual(hue.lifecycle_state, DKCL_LIFECYCLE_STATES.F13_READY, 'Hue preflight exposes shared F13_READY lifecycle');
    assert.strictEqual(tct.lifecycle_state, DKCL_LIFECYCLE_STATES.F13_READY, 'TCT preflight exposes shared F13_READY lifecycle');
    assert.strictEqual(hue.lifecycle.source_page_ready, true, 'Hue lifecycle payload preserves source page readiness');
    assert.strictEqual(tct.lifecycle.source_page_ready, true, 'TCT lifecycle payload preserves source page readiness');
    assert.notStrictEqual(SOURCE_CONFIG.HUE.defaultProfileDir(), SOURCE_CONFIG.TCT.defaultProfileDir(), 'Hue and TCT profiles are separate');
    assert.strictEqual(calls.filter((call) => call[0] === 'close').length, 2, 'profile locks are released via close');

    console.log('\nTEST 2: authentication required result');
    const authService = new DkclSessionPreflightService({
        portalClientFactory: () => makeClient({
            calls: [],
            authenticateImpl: async () => {
                const error = new Error('login required');
                error.code = 'AUTHENTICATION_REQUIRED';
                throw error;
            }
        })
    });
    const auth = await authService.preflight('TCT');
    assert.strictEqual(auth.status, PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED, 'auth-required maps to AUTHENTICATION_REQUIRED');
    assert.strictEqual(auth.error.code, 'AUTHENTICATION_REQUIRED', 'safe auth code is exposed');
    assert(!/password|cookie|token|localStorage|authorization/i.test(auth.error.message), 'safe auth message contains no secrets');

    console.log('\nTEST 3: session check failed result');
    const failedService = new DkclSessionPreflightService({
        portalClientFactory: () => makeClient({
            calls: [],
            authenticateImpl: async () => {
                const error = new Error('network down');
                error.code = 'NETWORK_DOWN';
                throw error;
            }
        })
    });
    const failed = await failedService.preflight('HUE');
    assert.strictEqual(failed.status, PREFLIGHT_STATUSES.SESSION_CHECK_FAILED, 'non-auth failures map to SESSION_CHECK_FAILED');
    assert.strictEqual(failed.error.code, 'NETWORK_DOWN', 'safe technical code is preserved');

    console.log('\nTEST 4: interactive browser window confirmed before LOGIN_IN_PROGRESS is returned');
    globalRegistry.clear();
    const interactiveCalls = [];
    const interactiveClient = {
        async prepareInteractiveAuthentication(args) { interactiveCalls.push(['prepare', args]); return true; },
        async waitInteractiveAuthentication() { interactiveCalls.push(['wait']); },
        async isF13ReportReady() { interactiveCalls.push(['ready']); return true; },
        async hideWindow() { interactiveCalls.push(['hide']); return true; },
        async restoreWindow() { interactiveCalls.push(['restore']); return true; },
        async close() { interactiveCalls.push(['close']); }
    };
    const interactiveService = new DkclSessionPreflightService({
        interactiveClientFactory: () => interactiveClient
    });
    const interactive = await interactiveService.interactiveAuthenticate('TCT');
    assert.strictEqual(interactive.status, PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS, 'interactiveAuthenticate returns LOGIN_IN_PROGRESS once window is confirmed open');
    assert.strictEqual(interactive.lifecycle_state, DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN, 'interactiveAuthenticate maps public response to WAITING_FOR_LOGIN');
    assert.strictEqual(interactiveCalls.some((c) => c[0] === 'prepare'), true, 'prepareInteractiveAuthentication is called');
    // Allow background waitInteractiveAuthentication to settle
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(interactiveService.getRegistryState('TCT').state, DKCL_LIFECYCLE_STATES.F13_READY, 'background task completes to F13_READY');
    assert(interactiveCalls.some((call) => call[0] === 'hide'), 'browser hides after login success in background');
    const activePreflight = await interactiveService.preflight('TCT');
    assert.strictEqual(activePreflight.status, PREFLIGHT_STATUSES.SESSION_VALID, 'active browser preflight remains valid without opening another process');
    assert.strictEqual(interactiveCalls.filter((call) => call[0] === 'prepare').length, 1, 'repeated preflight does not launch a duplicate browser');

    const redirectedCalls = [];
    const redirectedClient = {
        async isF13ReportReady() { redirectedCalls.push(['ready']); return redirectedCalls.filter((call) => call[0] === 'ready').length > 1; },
        async isAuthenticated() { redirectedCalls.push(['authenticated']); return true; },
        async restoreWindow() { redirectedCalls.push(['restore']); },
        async openF13Report() { redirectedCalls.push(['open-report']); }
    };
    globalRegistry.set('TCT', {
        state: DKCL_LIFECYCLE_STATES.F13_READY,
        lifecycleState: DKCL_LIFECYCLE_STATES.F13_READY,
        client: redirectedClient,
        openingPromise: null,
        authenticated: true,
        backgroundReady: true,
        lastError: null,
        updatedAt: new Date().toISOString()
    });
    const redirectedPreflight = await interactiveService.preflight('TCT');
    assert.strictEqual(redirectedPreflight.status, PREFLIGHT_STATUSES.SESSION_VALID, 'active authenticated portal returns to F1.3 before preflight succeeds');
    assert(redirectedCalls.some((call) => call[0] === 'open-report'), 'file-management tab is redirected to the F1.3 report page');

    console.log('\nTEST 5: TCT interactive in-progress lifecycle is stable under polling');
    globalRegistry.clear();
    const openingCalls = [];
    const openingClient = {
        async restoreWindow() { openingCalls.push(['restore']); },
        async openF13Report() { openingCalls.push(['open-report']); },
        async close() { openingCalls.push(['close']); }
    };
    globalRegistry.set('TCT', {
        state: DKCL_LIFECYCLE_STATES.OPENING_BROWSER,
        client: openingClient,
        openingPromise: Promise.resolve(),
        authenticated: false,
        backgroundReady: false,
        windowHidden: false,
        hideAttempted: false,
        lastError: null,
        updatedAt: new Date().toISOString()
    });
    const openingService = new DkclSessionPreflightService();
    const openingPreflight = await openingService.preflight('TCT');
    assert.strictEqual(openingPreflight.status, PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS, 'preflight reports explicit in-progress status while opening');
    assert.strictEqual(openingPreflight.lifecycle_state, DKCL_LIFECYCLE_STATES.OPENING_BROWSER, 'opening preflight exposes shared OPENING_BROWSER lifecycle');
    assert.strictEqual(openingService.getInteractiveClient('TCT'), openingClient, 'preflight preserves opening client');
    assert.deepStrictEqual(openingCalls, [], 'preflight does not restore, open report, or close during opening state');

    globalRegistry.clear();
    const waitForLogin = deferred();
    const lifecycleCalls = [];
    const lifecycleClient = {
        async prepareInteractiveAuthentication(args) {
            lifecycleCalls.push(['prepare', args]);
            return true;
        },
        async waitInteractiveAuthentication() {
            lifecycleCalls.push(['wait']);
            await waitForLogin.promise;
        },
        async isF13ReportReady() { lifecycleCalls.push(['ready']); return true; },
        async openF13Report() { lifecycleCalls.push(['open-report']); },
        async hideWindow() { lifecycleCalls.push(['hide']); return true; },
        async restoreWindow() { lifecycleCalls.push(['restore']); return true; },
        async close() { lifecycleCalls.push(['close']); }
    };
    const lifecycleService = new DkclSessionPreflightService({
        interactiveClientFactory: () => lifecycleClient
    });
    const firstAuth = lifecycleService.interactiveAuthenticate('TCT');
    const secondAuth = lifecycleService.interactiveAuthenticate('TCT');
    await new Promise((resolve) => setImmediate(resolve));
    assert.strictEqual(lifecycleService.getInteractiveClient('TCT'), lifecycleClient, 'persistent client is retained while login is waiting');
    const waitingPreflight = await lifecycleService.preflight('TCT');
    assert.strictEqual(waitingPreflight.status, PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS, 'preflight reports explicit in-progress status while waiting');
    assert.strictEqual(waitingPreflight.lifecycle_state, DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN, 'waiting preflight exposes shared WAITING_FOR_LOGIN lifecycle');
    assert.strictEqual(lifecycleService.getInteractiveClient('TCT'), lifecycleClient, 'preflight preserves waiting client');
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'close').length, 0, 'preflight does not close waiting client');
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'open-report').length, 0, 'preflight does not open F1.3 report while waiting');
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'prepare').length, 1, 'only one persistent browser client is opened');
    // Both firstAuth and secondAuth should resolve to LOGIN_IN_PROGRESS (async open design)
    const completedAuth = await firstAuth;
    const duplicateAuth = await secondAuth;
    assert.strictEqual(completedAuth.status, PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS, 'auth returns LOGIN_IN_PROGRESS after window open');
    assert.strictEqual(duplicateAuth.status, PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS, 'duplicate auth click sees the same in-progress result');
    // Resolve the background login to let it complete
    waitForLogin.resolve();
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'hide').length, 1, 'hide is called once after confirmed authentication');
    assert.strictEqual(lifecycleService.getRegistryState('TCT').state, DKCL_LIFECYCLE_STATES.F13_READY, 'authenticated client transitions to F13_READY');

    console.log('\nTEST 6: hide failure and manual close preserve source-keyed lifecycle');
    globalRegistry.clear();
    globalRegistry.set('HUE', {
        state: DKCL_LIFECYCLE_STATES.F13_READY,
        lifecycleState: DKCL_LIFECYCLE_STATES.F13_READY,
        client: { marker: 'hue' },
        openingPromise: null,
        authenticated: true,
        backgroundReady: true,
        windowHidden: true,
        hideAttempted: true,
        lastError: null,
        updatedAt: new Date().toISOString()
    });
    const hideFailureCalls = [];
    const hideFailureClient = {
        async prepareInteractiveAuthentication() { hideFailureCalls.push(['prepare']); return true; },
        async waitInteractiveAuthentication() { hideFailureCalls.push(['wait']); },
        async openF13Report() { hideFailureCalls.push(['open-report']); },
        async isF13ReportReady() { hideFailureCalls.push(['ready']); return true; },
        async hideWindow() { hideFailureCalls.push(['hide']); throw new Error('window manager unavailable'); },
        async close() { hideFailureCalls.push(['close']); }
    };
    const hideFailureService = new DkclSessionPreflightService({
        interactiveClientFactory: () => hideFailureClient
    });
    const hideFailureResult = await hideFailureService.interactiveAuthenticate('TCT');
    assert.strictEqual(hideFailureResult.status, PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS, 'interactiveAuthenticate returns LOGIN_IN_PROGRESS after window open');
    // Wait for background task to settle with hide failure
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(hideFailureService.getRegistryState('TCT').state, DKCL_LIFECYCLE_STATES.F13_READY, 'hide failure still reaches F13_READY state');
    assert.strictEqual(hideFailureService.getRegistryState('TCT').windowHidden, false, 'failed hide is not recorded as successful');
    assert.strictEqual(hideFailureService.getRegistryState('TCT').hideAttempted, true, 'hide failure is still recorded as attempted once');
    assert.strictEqual(hideFailureCalls.filter((call) => call[0] === 'close').length, 0, 'hide failure does not close browser');
    hideFailureClient.onDisconnect();
    assert.strictEqual(hideFailureService.getRegistryState('TCT').state, 'SESSION_EXPIRED', 'manual close expires TCT entry');
    assert.strictEqual(hideFailureService.getInteractiveClient('TCT'), null, 'manual close clears TCT client');
    assert.strictEqual(globalRegistry.get('HUE').client.marker, 'hue', 'manual TCT close does not mutate HUE registry');

    console.log('\nTEST 6B: HUE interactive login accepts authenticated marker without TCT report marker');
    const hueClient = new DkclHueF13PortalClient({
        source: 'HUE',
        playwright: {
            chromium: {
                launchPersistentContext: async () => ({
                    on() {},
                    pages: () => [{
                        url: () => 'https://dkcl.example/login',
                        goto: async () => {},
                        waitForTimeout: async () => {}
                    }],
                    newPage: async () => ({
                        url: () => 'https://dkcl.example/login',
                        goto: async () => {},
                        waitForTimeout: async () => {}
                    })
                })
            }
        }
    });
    const hueClientCalls = [];
    hueClient.acquireProfileLock = () => { hueClientCalls.push(['lock']); };
    hueClient.restoreWindow = async () => { hueClientCalls.push(['restore']); return true; };
    // Test the split API: prepare navigates to login, waitInteractiveAuthentication waits for user
    // isAuthenticated returns true only after waitForManualAuthentication is called
    hueClient.isAuthenticated = async () => {
        hueClientCalls.push(['authenticated']);
        return hueClientCalls.some((c) => c[0] === 'wait-manual');
    };
    hueClient.openF13Report = async () => { hueClientCalls.push(['open-report']); throw new Error('HUE report marker unavailable'); };
    hueClient.isF13ReportReady = async () => { hueClientCalls.push(['ready']); return false; };
    hueClient.waitForManualAuthentication = async () => { hueClientCalls.push(['wait-manual']); return true; };
    // Test the split API: prepare navigates to login, waitInteractiveAuthentication waits for user
    await hueClient.prepareInteractiveAuthentication({
        baseUrl: 'https://dkcl.example/',
        profileDir: path.join('tmp', 'HUE')
    });
    await hueClient.waitInteractiveAuthentication();
    assert(hueClientCalls.some((call) => call[0] === 'wait-manual'), 'HUE waits for manual login completion');
    assert(hueClientCalls.some((call) => call[0] === 'open-report'), 'HUE still attempts to navigate toward F1.3 after login');
    assert.strictEqual(hueClientCalls.filter((call) => call[0] === 'ready').length, 0, 'HUE does not require the TCT report-ready select marker');


    console.log('\nTEST 7: R4.1B interactive NONE classification (no cleanup, launch proceeds)');
    browserProcessManager.findBrowserProcessByProfile = async () => ({
        inspectionStatus: 'SUCCESS',
        matchingProcesses: [],
        errorCode: null
    });
    let cleanupCalled = false;
    browserProcessManager.cleanupStaleLocks = () => { cleanupCalled = true; };
    globalRegistry.clear();
    const noneService = new DkclSessionPreflightService({ interactiveClientFactory: () => ({ prepareInteractiveAuthentication: async () => true, waitInteractiveAuthentication: async () => {}, hideWindow: async () => true, close: async () => {} }) });
    await noneService.interactiveAuthenticate('HUE');
    assert.strictEqual(cleanupCalled, false, 'NONE classification should not clean locks');
    assert.strictEqual(global.terminateCount || 0, 0, 'terminateProcessTree count should be 0');

    console.log('\nTEST 8: R4.1B interactive STALE_CONFIRMED classification (cleanup once, launch proceeds)');
    const fsMod = require('fs');
    const originalExistsSync = fsMod.existsSync;
    fsMod.existsSync = (path) => path.endsWith('.lock') ? true : originalExistsSync(path);
    globalRegistry.clear(); cleanupCalled = false;
    const noneService2 = new DkclSessionPreflightService({ interactiveClientFactory: () => ({ prepareInteractiveAuthentication: async () => true, waitInteractiveAuthentication: async () => {}, hideWindow: async () => true, close: async () => {} }) });
    await noneService2.interactiveAuthenticate('TCT');
    assert.strictEqual(cleanupCalled, true, 'STALE_CONFIRMED classification should clean locks');
    fsMod.existsSync = originalExistsSync;

    console.log('\nTEST 9: R4.1B interactive LIVE_UNVERIFIED classification (no terminate, no cleanup, throws explicit code)');
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

    console.log('\nTEST 10: R4.1B recover STALE_CONFIRMED classification');
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

    console.log('\nTEST 11: R4.1B terminateProcessTree call count remains zero');
    assert.strictEqual(global.terminateCount || 0, 0, 'terminateProcessTree must never be called by interactive or recover in R4.1B');


    console.log('\nTEST 12: HUE cancel-login contract verification');
    globalRegistry.clear();
    let hueCancelCloseCalled = false;
    const hueCancelClient = {
        async prepareInteractiveAuthentication() { return true; },
        async waitInteractiveAuthentication() { },
        async close() { hueCancelCloseCalled = true; }
    };
    const cancelService = new DkclSessionPreflightService({
        interactiveClientFactory: () => hueCancelClient
    });
    // Set HUE in progress
    await cancelService.interactiveAuthenticate('HUE');
    // Call cancel
    const cancelRes = await cancelService.cancelInteractiveLogin('HUE');
    assert.strictEqual(cancelRes.cancelled, true, 'cancellation is successful');
    assert.strictEqual(hueCancelCloseCalled, true, 'HUE client close was invoked');
    assert.strictEqual(cancelService.getInteractiveClient('HUE'), null, 'HUE interactive client is cleared');
    assert.strictEqual(cancelService.getRegistryState('TCT').client, null, 'TCT client remains unaffected');

    console.log('\nTEST 13: restoreWindow processManager resolution verification');
    const client = new DkclHueF13PortalClient({
        source: 'HUE',
        playwright: {}
    });
    client.profileDir = 'tmp/HUE_TEST_DIR';
    const originalShow = browserProcessManager.showBrowserWindowsByProfile;
    let showCalledWith = null;
    browserProcessManager.showBrowserWindowsByProfile = async (profileDir) => {
        showCalledWith = profileDir;
        return { success: true, matchedWindowCount: 1 };
    };
    client.setWindowState = async () => true;
    const restoreResult = await client.restoreWindow();
    assert.strictEqual(restoreResult, true, 'restoreWindow executes successfully');
    assert.strictEqual(showCalledWith, 'tmp/HUE_TEST_DIR', 'showBrowserWindowsByProfile was called with the correct profile dir');
    browserProcessManager.showBrowserWindowsByProfile = originalShow;

    console.log('\nRESULT: dkclSessionPreflightService checks passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});

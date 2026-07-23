'use strict';

const assert = require('assert/strict');
const path = require('path');
const { DkclSessionPreflightService, PREFLIGHT_STATUSES, SOURCE_CONFIG, globalRegistry } = require('./src/services/dkclSessionPreflightService');
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

    console.log('\nTEST 4: interactive browser remains visible until export readiness');
    globalRegistry.clear();
    const interactiveCalls = [];
    const interactiveClient = {
        async openInteractiveAuthentication(args) { interactiveCalls.push(['open', args]); },
        async isF13ReportReady() { interactiveCalls.push(['ready']); return true; },
        async minimizeWindow() { interactiveCalls.push(['minimize']); },
        async restoreWindow() { interactiveCalls.push(['restore']); },
        async close() { interactiveCalls.push(['close']); }
    };
    const interactiveService = new DkclSessionPreflightService({
        interactiveClientFactory: () => interactiveClient
    });
    const interactive = await interactiveService.interactiveAuthenticate('TCT');
    assert.strictEqual(interactive.status, PREFLIGHT_STATUSES.SESSION_VALID, 'manual login returns valid only after the source page is ready');
    assert.strictEqual(interactiveService.getInteractiveClient('TCT'), interactiveClient, 'ready browser is retained for queue work');
    assert(interactiveCalls.some((call) => call[0] === 'minimize'), 'browser minimizes after login success');
    assert.strictEqual(interactive.export_readiness, 'SOURCE_PAGE_READY', 'interactive auth checks source page readiness once before backgrounding');
    const activePreflight = await interactiveService.preflight('TCT');
    assert.strictEqual(activePreflight.status, PREFLIGHT_STATUSES.SESSION_VALID, 'active browser preflight remains valid without opening another process');
    assert.strictEqual(interactiveCalls.filter((call) => call[0] === 'open').length, 1, 'repeated preflight does not launch a duplicate browser');

    const redirectedCalls = [];
    const redirectedClient = {
        async isF13ReportReady() { redirectedCalls.push(['ready']); return redirectedCalls.filter((call) => call[0] === 'ready').length > 1; },
        async isAuthenticated() { redirectedCalls.push(['authenticated']); return true; },
        async restoreWindow() { redirectedCalls.push(['restore']); },
        async openF13Report() { redirectedCalls.push(['open-report']); }
    };
    globalRegistry.set('TCT', {
        state: 'BACKGROUND_READY',
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
        state: 'OPENING_BROWSER',
        client: openingClient,
        openingPromise: Promise.resolve(),
        authenticated: false,
        backgroundReady: false,
        minimized: false,
        lastError: null,
        updatedAt: new Date().toISOString()
    });
    const openingService = new DkclSessionPreflightService();
    const openingPreflight = await openingService.preflight('TCT');
    assert.strictEqual(openingPreflight.status, PREFLIGHT_STATUSES.LOGIN_IN_PROGRESS, 'preflight reports explicit in-progress status while opening');
    assert.strictEqual(openingService.getInteractiveClient('TCT'), openingClient, 'preflight preserves opening client');
    assert.deepStrictEqual(openingCalls, [], 'preflight does not restore, open report, or close during opening state');

    globalRegistry.clear();
    const waitForLogin = deferred();
    const lifecycleCalls = [];
    const lifecycleClient = {
        async openInteractiveAuthentication(args) {
            lifecycleCalls.push(['open', args]);
            await waitForLogin.promise;
        },
        async isF13ReportReady() { lifecycleCalls.push(['ready']); return true; },
        async openF13Report() { lifecycleCalls.push(['open-report']); },
        async minimizeWindow() { lifecycleCalls.push(['minimize']); return true; },
        async restoreWindow() { lifecycleCalls.push(['restore']); },
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
    assert.strictEqual(lifecycleService.getInteractiveClient('TCT'), lifecycleClient, 'preflight preserves waiting client');
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'close').length, 0, 'preflight does not close waiting client');
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'restore').length, 0, 'preflight does not repeatedly restore waiting client');
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'open-report').length, 0, 'preflight does not open F1.3 report while waiting');
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'open').length, 1, 'only one persistent browser client is opened');
    waitForLogin.resolve();
    const completedAuth = await firstAuth;
    const duplicateAuth = await secondAuth;
    assert.strictEqual(completedAuth.status, PREFLIGHT_STATUSES.SESSION_VALID, 'auth completes after manual login resolves');
    assert.strictEqual(duplicateAuth.status, PREFLIGHT_STATUSES.SESSION_VALID, 'duplicate auth click shares the same lifecycle result');
    assert.strictEqual(lifecycleCalls.filter((call) => call[0] === 'minimize').length, 1, 'minimize is called once after confirmed authentication');
    assert.strictEqual(lifecycleService.getRegistryState('TCT').state, 'BACKGROUND_READY', 'authenticated client transitions to background ready');

    console.log('\nTEST 6: minimize failure and manual close preserve source-keyed lifecycle');
    globalRegistry.clear();
    globalRegistry.set('HUE', {
        state: 'BACKGROUND_READY',
        client: { marker: 'hue' },
        openingPromise: null,
        authenticated: true,
        backgroundReady: true,
        minimized: true,
        lastError: null,
        updatedAt: new Date().toISOString()
    });
    const minimizeFailureCalls = [];
    const minimizeFailureClient = {
        async openInteractiveAuthentication() { minimizeFailureCalls.push(['open']); },
        async openF13Report() { minimizeFailureCalls.push(['open-report']); },
        async isF13ReportReady() { minimizeFailureCalls.push(['ready']); return true; },
        async minimizeWindow() { minimizeFailureCalls.push(['minimize']); throw new Error('window manager unavailable'); },
        async close() { minimizeFailureCalls.push(['close']); }
    };
    const minimizeFailureService = new DkclSessionPreflightService({
        interactiveClientFactory: () => minimizeFailureClient
    });
    const minimizeFailureResult = await minimizeFailureService.interactiveAuthenticate('TCT');
    assert.strictEqual(minimizeFailureResult.status, PREFLIGHT_STATUSES.SESSION_VALID, 'minimize failure still returns valid authenticated session');
    assert.strictEqual(minimizeFailureResult.browser_minimized, false, 'minimize failure is reported as best-effort false');
    assert.strictEqual(minimizeFailureService.getInteractiveClient('TCT'), minimizeFailureClient, 'authenticated client is preserved when minimize fails');
    minimizeFailureClient.onDisconnect();
    assert.strictEqual(minimizeFailureService.getRegistryState('TCT').state, 'SESSION_EXPIRED', 'manual close expires TCT entry');
    assert.strictEqual(minimizeFailureService.getInteractiveClient('TCT'), null, 'manual close clears TCT client');
    assert.strictEqual(globalRegistry.get('HUE').client.marker, 'hue', 'manual TCT close does not mutate HUE registry');


    console.log('\nTEST 7: R4.1B interactive NONE classification (no cleanup, launch proceeds)');
    browserProcessManager.findBrowserProcessByProfile = async () => ({
        inspectionStatus: 'SUCCESS',
        matchingProcesses: [],
        errorCode: null
    });
    let cleanupCalled = false;
    browserProcessManager.cleanupStaleLocks = () => { cleanupCalled = true; };
    globalRegistry.clear(); const noneService = new DkclSessionPreflightService({ interactiveClientFactory: () => ({ openInteractiveAuthentication: async () => {}, minimizeWindow: async () => true, close: async () => {} }) });
    await noneService.interactiveAuthenticate('HUE');
    assert.strictEqual(cleanupCalled, false, 'NONE classification should not clean locks');
    assert.strictEqual(global.terminateCount || 0, 0, 'terminateProcessTree count should be 0');

    console.log('\nTEST 8: R4.1B interactive STALE_CONFIRMED classification (cleanup once, launch proceeds)');
    const fsMod = require('fs');
    const originalExistsSync = fsMod.existsSync;
    fsMod.existsSync = (path) => path.endsWith('.lock') ? true : originalExistsSync(path);
    globalRegistry.clear(); cleanupCalled = false;
    await noneService.interactiveAuthenticate('TCT');
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


    console.log('\nRESULT: dkclSessionPreflightService checks passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});

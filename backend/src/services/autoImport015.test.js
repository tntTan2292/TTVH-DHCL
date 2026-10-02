'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { BrowserProcessManager } = require('./browserProcessManager');
const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');
const {
    DkclSessionPreflightService,
    PREFLIGHT_STATUSES,
    globalRegistry,
    getOrCreateRegistryEntry
} = require('./dkclSessionPreflightService');
const { DKCL_LIFECYCLE_STATES, DKCL_LEGACY_STATES } = require('./dkclLifecycleContract');
const dkclSharedOperationsController = require('../controllers/dkclSharedOperationsController');

test('AUTO-IMPORT-015 Phase B.1 & B.5: stopForSecurityChallenge never waits in background or hidden window', async () => {
    const client = new DkclHueF13PortalClient({
        headless: false,
        source: 'HUE',
        manualAuthWaitMs: 240000
    });

    let waitCalled = false;
    client.waitForManualAuthentication = async () => {
        waitCalled = true;
        return true;
    };

    // Case 1: Background execution (interactiveMode = false)
    client.interactiveMode = false;
    client.windowHidden = false;
    client.page = {
        locator: () => ({
            innerText: async () => 'Trang đăng nhập tập trung SSO'
        })
    };

    await assert.rejects(
        async () => client.stopForSecurityChallenge(),
        (err) => {
            assert.equal(err.code, 'AUTHENTICATION_REQUIRED');
            return true;
        },
        'Should immediately throw AUTHENTICATION_REQUIRED in background execution without waiting'
    );
    assert.equal(waitCalled, false, 'waitForManualAuthentication should not have been called');

    // Case 2: Interactive mode but window is hidden
    client.interactiveMode = true;
    client.windowHidden = true;

    await assert.rejects(
        async () => client.stopForSecurityChallenge(),
        (err) => {
            assert.equal(err.code, 'AUTHENTICATION_REQUIRED');
            return true;
        },
        'Should immediately throw AUTHENTICATION_REQUIRED if window is hidden'
    );
    assert.equal(waitCalled, false, 'waitForManualAuthentication should not have been called in hidden window');

    // Case 3: Interactive mode and window is visible
    client.interactiveMode = true;
    client.windowHidden = false;

    await client.stopForSecurityChallenge();
    assert.equal(waitCalled, true, 'waitForManualAuthentication should be called when interactive and visible');
});

test('AUTO-IMPORT-015 Phase B.3: terminateProcessTree handles exit code 128 / not found / dead process as success', async () => {
    const mgr = new BrowserProcessManager();

    // Mock runCommand throwing exit code 128 (process not found)
    mgr.runCommand = async () => {
        const err = new Error('Command failed');
        err.code = 128;
        err.stderr = 'ERROR: The process "999999" not found.\r\n';
        throw err;
    };
    mgr.isProcessDead = () => true;

    // Should not throw
    await mgr.terminateProcessTree(999999);

    // Mock runCommand throwing real unexpected error with live process
    mgr.runCommand = async () => {
        const err = new Error('Access denied');
        err.code = 1;
        err.stderr = 'ERROR: Access is denied.\r\n';
        throw err;
    };
    mgr.isProcessDead = () => false;

    await assert.rejects(
        async () => mgr.terminateProcessTree(888888),
        (err) => {
            assert.equal(err.code, 'ORPHAN_PROCESS_RECOVERY_FAILED');
            assert.match(err.message, /Access is denied/);
            return true;
        }
    );
});

test('AUTO-IMPORT-015 Phase B.3: reclaimOrphanedProfile handles already-dead processes gracefully', async () => {
    const service = new DkclSessionPreflightService({ coordinatorEnabled: false });

    const classification = {
        inspection: {
            matchingProcesses: [
                { pid: 1234, parentPid: 1, exactProfileMatch: true }
            ]
        }
    };

    let terminateCalled = false;
    const originalTerminate = require('./browserProcessManager').terminateProcessTree;
    require('./browserProcessManager').terminateProcessTree = async (pid) => {
        terminateCalled = true;
    };

    try {
        await service.reclaimOrphanedProfile(classification, 'D:/test_profile');
        assert.equal(terminateCalled, true);
    } finally {
        require('./browserProcessManager').terminateProcessTree = originalTerminate;
    }
});

test('AUTO-IMPORT-015 Phase B.3: interactiveAuthenticate does not get stuck in OPENING_BROWSER on error', async () => {
    const service = new DkclSessionPreflightService({
        coordinatorEnabled: false,
        interactiveClientFactory: () => ({
            interactiveMode: false,
            prepareInteractiveAuthentication: async () => {
                const err = new Error('Chrome binary failed to launch');
                err.code = 'BROWSER_LAUNCH_FAILED';
                throw err;
            },
            close: async () => {}
        })
    });

    const entry = service.getRegistryState('HUE');
    entry.state = DKCL_LEGACY_STATES.SESSION_EXPIRED;
    entry.openingPromise = null;

    await assert.rejects(
        async () => service.interactiveAuthenticate('HUE'),
        (err) => {
            assert.equal(err.code, 'BROWSER_LAUNCH_FAILED');
            return true;
        }
    );

    // Verify entry state is NOT stuck in OPENING_BROWSER
    assert.equal(entry.state, DKCL_LEGACY_STATES.SESSION_EXPIRED);
    assert.equal(entry.openingPromise, null, 'openingPromise must be cleared in finally');
    assert.equal(entry.lastError, 'Chrome binary failed to launch');
});

test('AUTO-IMPORT-015 Phase B.4: dkclSharedOperationsController preserves real error codes and messages', async () => {
    function createMockRes() {
        return {
            statusCode: null,
            payload: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                this.payload = data;
                return this;
            }
        };
    }

    const { DkclSharedOperationsController } = dkclSharedOperationsController;
    const mockPreflightService = {
        interactiveAuthenticate: async () => {
            const err = new Error('ORPHAN_PROCESS_RECOVERY_FAILED: Could not terminate PID 30644');
            err.code = 'ORPHAN_PROCESS_RECOVERY_FAILED';
            throw err;
        }
    };

    const controller = new DkclSharedOperationsController({
        sessionPreflightService: mockPreflightService
    });

    const res = createMockRes();
    await controller.interactiveAuthenticate({ body: { source: 'HUE' } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.success, false);
    assert.equal(res.payload.error.code, 'ORPHAN_PROCESS_RECOVERY_FAILED');
    assert.equal(res.payload.error.message, 'ORPHAN_PROCESS_RECOVERY_FAILED: Could not terminate PID 30644');
});

test('AUTO-IMPORT-015 Phase B.5: Day-rollover triggers active revalidation and expires session when SSO expired', async () => {
    const service = new DkclSessionPreflightService({
        coordinatorEnabled: false,
        reprobeRetryDelayMs: 10
    });

    let revalidateCalled = false;
    let closeCalled = false;

    const mockClient = {
        revalidateSession: async () => {
            revalidateCalled = true;
            return false; // Server rejected / redirected to /sso/login
        },
        isF13ReportReady: async () => true, // Old DOM was still present
        isAuthenticated: async () => true,
        hasLoginForm: async () => false,
        restoreWindow: async () => {},
        close: async () => {
            closeCalled = true;
        }
    };

    const entry = service.getRegistryState('HUE');
    entry.client = mockClient;
    entry.state = DKCL_LIFECYCLE_STATES.F13_READY;
    entry.authenticated = true;
    entry.backgroundReady = true;
    entry.activeOperation = null;
    // Set last validated date to yesterday
    entry.lastValidatedDate = '2026-10-01';
    entry.lastValidatedAt = Date.now() - 24 * 60 * 60 * 1000;

    const sourceConfig = service.normalizeSource('HUE');
    const result = await service.probeAndMaybeExpireClient(sourceConfig, entry);

    assert.equal(revalidateCalled, true, 'revalidateSession should be called on day rollover');
    assert.equal(result.status, PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED);
    assert.equal(entry.state, DKCL_LEGACY_STATES.SESSION_EXPIRED);
    assert.equal(entry.client, null);
    assert.equal(closeCalled, true, 'Client should be closed after day-rollover expiry');
});

test('AUTO-IMPORT-015 Phase B.5: Day-rollover does not expire session if actively owned by an operation', async () => {
    const service = new DkclSessionPreflightService({
        coordinatorEnabled: false,
        reprobeRetryDelayMs: 10
    });

    let revalidateCalled = false;

    const mockClient = {
        revalidateSession: async () => {
            revalidateCalled = true;
            return false;
        },
        isF13ReportReady: async () => true,
        isAuthenticated: async () => true,
        hasLoginForm: async () => false
    };

    const entry = service.getRegistryState('HUE');
    entry.client = mockClient;
    entry.state = DKCL_LIFECYCLE_STATES.F13_READY;
    entry.authenticated = true;
    entry.backgroundReady = true;
    // An operation owns the session
    entry.activeOperation = 'AUTO_BACKFILL_F13_HUE';
    entry.lastValidatedDate = '2026-10-01';

    const sourceConfig = service.normalizeSource('HUE');
    const result = await service.probeAndMaybeExpireClient(sourceConfig, entry);

    assert.equal(revalidateCalled, false, 'revalidateSession must not run if activeOperation is set');
    assert.equal(result.status, PREFLIGHT_STATUSES.SESSION_VALID);
    assert.equal(entry.client, mockClient, 'Client must remain attached');
});

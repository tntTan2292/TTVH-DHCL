'use strict';

// "Đăng nhập" / "Đăng nhập lại" on a source whose window is already open (reopened by the keep-alive, or left from an
// earlier login) shows that window again. The session strip must then follow what really happens in it: a window that
// is signed in, or that the person signs in to, becomes "Đã đăng nhập"; one left unsigned times out. It must never stay
// at "Đang chờ đăng nhập" for good (2026-10-26: TCT stuck after the PO clicked while the reopened window was signed in).

const test = require('node:test');
const assert = require('node:assert/strict');
const { DkclSessionPreflightService, globalRegistry, DKCL_LIFECYCLE_STATES } = require('./dkclSessionPreflightService');
const browserProcessManager = require('./browserProcessManager');

browserProcessManager.findBrowserProcessByProfile = async () => ({ inspectionStatus: 'SUCCESS', matchingProcesses: [], errorCode: null });
browserProcessManager.terminateProcessTree = async () => {};
browserProcessManager.cleanupStaleLocks = () => {};
browserProcessManager.showBrowserWindowsByProfile = async () => ({ success: true });

function openWindowClient({ signedIn = true, signInAfterMs = null, neverSignsIn = false } = {}) {
    const calls = { restore: 0, wait: 0, hide: 0, close: 0 };
    const client = {
        calls,
        signedIn,
        manualAuthWaitMs: 60000,
        async restoreWindow() { calls.restore += 1; return true; },
        async isAuthenticated() { return client.signedIn; },
        async isF13ReportReady() { return client.signedIn; },
        async hasLoginForm() { return !client.signedIn; },
        async waitInteractiveAuthentication() {
            calls.wait += 1;
            if (client.signedIn) return;
            if (neverSignsIn) throw Object.assign(new Error('AUTHENTICATION_REQUIRED: manual DKCL login was not completed.'), { code: 'AUTHENTICATION_REQUIRED' });
            await new Promise((resolve) => setTimeout(resolve, signInAfterMs || 0));
            client.signedIn = true;
        },
        async hideWindow() { calls.hide += 1; return true; },
        async close() { calls.close += 1; },
    };
    return client;
}

// the source as the keep-alive leaves it after reopening the window from the saved session
function serviceWithOpenWindow(source, client, patch = {}) {
    globalRegistry.clear();
    const service = new DkclSessionPreflightService({
        interactiveClientFactory: () => { throw new Error('a second browser must not be launched'); },
        coordinatorEnabled: false,
        hueBrokerEnabled: false,
    });
    Object.assign(service.getRegistryState(source), {
        state: DKCL_LIFECYCLE_STATES.F13_READY,
        lifecycleState: DKCL_LIFECYCLE_STATES.F13_READY,
        client,
        authenticated: true,
        backgroundReady: true,
        windowHidden: true,
        hideAttempted: true,
        profileDir: `C:/profiles/${source}`,
        ...patch,
    });
    return service;
}

async function statusEventually(service, source, expected) {
    const deadline = Date.now() + 3000;
    let last;
    while (Date.now() < deadline) {
        last = (await service.getSessionStatus(source)).status;
        if (last === expected) return last;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return last;
}

test('reopening a window that is already signed in ends as signed in, not waiting for login', async () => {
    const client = openWindowClient({ signedIn: true });
    const service = serviceWithOpenWindow('TCT', client);
    const response = await service.interactiveAuthenticate('TCT');
    assert.equal(client.calls.restore >= 1, true, 'the window is shown');
    assert.equal(response.status === 'LOGIN_IN_PROGRESS' || response.status === 'SESSION_VALID', true);
    assert.equal(await statusEventually(service, 'TCT', 'SESSION_VALID'), 'SESSION_VALID');
    const entry = service.getRegistryState('TCT');
    assert.equal(entry.authenticated, true);
    assert.equal(entry.backgroundReady, true);
});

test('reopening a window the person then signs in to flips to signed in', async () => {
    const client = openWindowClient({ signedIn: false, signInAfterMs: 50 });
    const service = serviceWithOpenWindow('TCT', client, { authenticated: false, backgroundReady: false, state: DKCL_LIFECYCLE_STATES.SESSION_CHECK, lifecycleState: DKCL_LIFECYCLE_STATES.SESSION_CHECK });
    const response = await service.interactiveAuthenticate('TCT');
    assert.equal(response.status, 'LOGIN_IN_PROGRESS');
    assert.equal((await service.getSessionStatus('TCT')).status, 'LOGIN_IN_PROGRESS', 'waiting while the person signs in');
    assert.equal(await statusEventually(service, 'TCT', 'SESSION_VALID'), 'SESSION_VALID');
    assert.equal(client.calls.wait, 1);
});

test('reopening a window nobody signs in to times out instead of waiting for ever', async () => {
    const client = openWindowClient({ signedIn: false, neverSignsIn: true });
    const service = serviceWithOpenWindow('HUE', client, { authenticated: false, backgroundReady: false, state: DKCL_LIFECYCLE_STATES.SESSION_CHECK, lifecycleState: DKCL_LIFECYCLE_STATES.SESSION_CHECK });
    await service.interactiveAuthenticate('HUE');
    assert.equal(await statusEventually(service, 'HUE', 'LOGIN_TIMEOUT'), 'LOGIN_TIMEOUT');
    assert.equal(client.calls.close, 1, 'the window and the profile are released');
});

test('reopening the window while an import uses the session only shows it and keeps the session as it is', async () => {
    const client = openWindowClient({ signedIn: true });
    const service = serviceWithOpenWindow('TCT', client, { activeOperation: 'AUTO_BACKFILL_F13_TCT' });
    const response = await service.interactiveAuthenticate('TCT');
    assert.equal(response.status, 'SESSION_VALID');
    assert.equal(client.calls.restore >= 1, true, 'the window is shown');
    assert.equal(client.calls.wait, 0, 'the page the import works in is not touched');
    const entry = service.getRegistryState('TCT');
    assert.equal(entry.state, DKCL_LIFECYCLE_STATES.F13_READY);
    assert.equal((await service.getSessionStatus('TCT')).status, 'SESSION_VALID');
});

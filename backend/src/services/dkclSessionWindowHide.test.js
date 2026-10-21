'use strict';

// The interactive DKCL browser window must go away once the session is ready, whichever way it got ready:
// a typed login, a saved session that was already valid when the window opened, or an F1.3 page that became
// ready only on a later probe.

const test = require('node:test');
const assert = require('node:assert/strict');
const { DkclSessionPreflightService, globalRegistry, DKCL_LIFECYCLE_STATES } = require('./dkclSessionPreflightService');
const browserProcessManager = require('./browserProcessManager');

browserProcessManager.findBrowserProcessByProfile = async () => ({ inspectionStatus: 'SUCCESS', matchingProcesses: [], errorCode: null });
browserProcessManager.terminateProcessTree = async () => {};
browserProcessManager.cleanupStaleLocks = () => {};
browserProcessManager.showBrowserWindowsByProfile = async () => ({ success: true });

function windowClient({ authenticatedOnOpen = false, waitError = null, hideResults = [true], withHide = true } = {}) {
    const calls = { hide: 0, restore: 0 };
    const client = {
        calls,
        interactiveAuthenticatedOnOpen: authenticatedOnOpen,
        ready: true,
        async prepareInteractiveAuthentication() {},
        async waitInteractiveAuthentication() { if (waitError) throw waitError; },
        async isF13ReportReady() { return client.ready; },
        async isAuthenticated() { return true; },
        async hasLoginForm() { return false; },
        async restoreWindow() { calls.restore += 1; return true; },
        async close() {},
    };
    if (withHide) {
        client.hideWindow = async () => {
            const result = hideResults[Math.min(calls.hide, hideResults.length - 1)];
            calls.hide += 1;
            return result;
        };
    }
    return client;
}

function serviceFor(client) {
    globalRegistry.clear();
    return new DkclSessionPreflightService({
        interactiveClientFactory: () => client,
        coordinatorEnabled: false,
        hueBrokerEnabled: false,
    });
}

async function untilReady(entry) {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
        if (entry.state === DKCL_LIFECYCLE_STATES.F13_READY && entry.backgroundReady) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail(`session never became ready (state ${entry.state})`);
}

test('typed login: the window is hidden once the F1.3 page is ready', async () => {
    const client = windowClient({ authenticatedOnOpen: false });
    const service = serviceFor(client);
    await service.interactiveAuthenticate('HUE');
    const entry = service.getRegistryState('HUE');
    await untilReady(entry);
    assert.equal(client.calls.hide, 1);
    assert.equal(entry.windowHidden, true);
    assert.equal(entry.hideAttempted, true);
});

test('saved session already valid when the window opens: the window is hidden too', async () => {
    const client = windowClient({ authenticatedOnOpen: true });
    const service = serviceFor(client);
    await service.interactiveAuthenticate('TCT');
    const entry = service.getRegistryState('TCT');
    await untilReady(entry);
    assert.equal(client.calls.hide, 1, 'the window must not stay on screen');
    assert.equal(entry.windowHidden, true);
});

test('F1.3 page ready only on a later probe: the window left visible is hidden then', async () => {
    const pageNotReady = Object.assign(new Error('SOURCE_PAGE_REQUIRED'), { code: 'SOURCE_PAGE_REQUIRED' });
    const client = windowClient({ waitError: pageNotReady });
    const service = serviceFor(client);
    await service.interactiveAuthenticate('HUE');
    const entry = service.getRegistryState('HUE');
    const deadline = Date.now() + 3000;
    while (!entry.pendingSourcePageWait && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(entry.pendingSourcePageWait, true, 'parked waiting for the page');
    assert.equal(client.calls.hide, 0, 'window stays visible while the page is not ready');

    const result = await service.preflight('HUE');
    assert.equal(result.status, 'SESSION_VALID');
    assert.equal(client.calls.hide, 1);
    assert.equal(entry.windowHidden, true);
});

test('an already hidden window is not hidden again on every later probe', async () => {
    const client = windowClient();
    const service = serviceFor(client);
    await service.interactiveAuthenticate('HUE');
    const entry = service.getRegistryState('HUE');
    await untilReady(entry);
    await service.preflight('HUE');
    await service.preflight('HUE');
    assert.equal(client.calls.hide, 1);
});

test('a hide that failed is retried by the next ready probe', async () => {
    const client = windowClient({ hideResults: [false, true] });
    const service = serviceFor(client);
    await service.interactiveAuthenticate('HUE');
    const entry = service.getRegistryState('HUE');
    await untilReady(entry);
    assert.equal(entry.windowHidden, false);
    assert.equal(entry.hideAttempted, true);

    await service.preflight('HUE');
    assert.equal(client.calls.hide, 2);
    assert.equal(entry.windowHidden, true);
});

test('a client without a hide function does not break the login', async () => {
    const client = windowClient({ withHide: false });
    const service = serviceFor(client);
    await service.interactiveAuthenticate('HUE');
    const entry = service.getRegistryState('HUE');
    await untilReady(entry);
    assert.equal(entry.authenticated, true);
    assert.equal(entry.windowHidden, false);
});

test('the window is left alone while an operation owns the session', async () => {
    const client = windowClient();
    const service = serviceFor(client);
    const entry = service.getRegistryState('TCT');
    entry.activeOperation = 'AUTO_BACKFILL_F11_TCT';
    const hidden = await service.hideWindowIfVisible({ source: 'TCT' }, entry, client);
    assert.equal(hidden, false);
    assert.equal(client.calls.hide, 0);
});

// ---- Clicking "Đăng nhập qua portal" must neither close nor hide the window ----

const { DkclHueF13PortalClient } = require('./dkclHueF13PortalClient');

function fakePage({ url, body = '', inputs = 0 }) {
    return {
        url: () => url,
        isClosed: () => false,
        locator: (selector) => ({
            innerText: async () => body,
            count: async () => (selector.includes('password') ? inputs : 0),
        }),
    };
}

test('the portal sign-in page is not a signed-in DKCL session, even if it shows logout-like text', async () => {
    const client = new DkclHueF13PortalClient({ headless: false, source: 'TCT' });
    client.baseUrl = 'https://dkcl.vnpost.vn';
    client.context = { pages: () => [] };
    client.page = fakePage({ url: 'https://portal.vnpost.vn/sso/start', body: 'Đăng xuất Quản lý tệp' });
    assert.equal(await client.isAuthenticated(), false);

    client.page = fakePage({ url: 'https://dkcl.vnpost.vn/kpi/chat-luong', body: 'Quản lý tệp Đăng xuất' });
    assert.equal(await client.isAuthenticated(), true, 'a DKCL page with the signed-in markers still counts');
});

test('a navigation cancelled by the portal redirect does not fail opening the window', async () => {
    const client = new DkclHueF13PortalClient({ headless: false, source: 'TCT' });
    client.baseUrl = 'https://dkcl.vnpost.vn';
    let waited = false;
    client.page = {
        async goto() { throw new Error('page.goto: net::ERR_ABORTED at https://dkcl.vnpost.vn/'); },
        async waitForLoadState() { waited = true; },
    };
    await client.gotoInterruptible('https://dkcl.vnpost.vn');
    assert.equal(waited, true);

    client.page = { async goto() { throw new Error('page.goto: net::ERR_NAME_NOT_RESOLVED'); } };
    await assert.rejects(() => client.gotoInterruptible('https://dkcl.vnpost.vn'), /ERR_NAME_NOT_RESOLVED/, 'real failures still surface');
});

test('the window is not hidden while the client says it is not signed in', async () => {
    const client = windowClient();
    client.isAuthenticated = async () => false;
    const service = serviceFor(client);
    const entry = service.getRegistryState('TCT');
    assert.equal(await service.hideWindowIfVisible({ source: 'TCT' }, entry, client), false);
    assert.equal(client.calls.hide, 0);
});

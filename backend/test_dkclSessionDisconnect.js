'use strict';

// IMPORT-SESSION-01 -- disconnect a DKCL source, status without a browser, no reattach after a disconnect.
// Run per file: node --test --experimental-sqlite test_dkclSessionDisconnect.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { DkclSessionPreflightService, globalRegistry } = require('./src/services/dkclSessionPreflightService');
const { DkclDisconnectFlags, clearProfileCookies } = require('./src/services/dkclSessionDisconnect');
const { DkclSessionKeepAlive } = require('./src/services/dkclSessionKeepAlive');
const { DKCL_LIFECYCLE_STATES } = require('./src/services/dkclLifecycleContract');
const { DkclSharedOperationsController } = require('./src/controllers/dkclSharedOperationsController');

function makeSandbox() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-session-'));
    const profileDir = path.join(dir, 'HUE');
    fs.mkdirSync(path.join(profileDir, 'Default', 'Network'), { recursive: true });
    fs.writeFileSync(path.join(profileDir, 'Default', 'Network', 'Cookies'), 'x');
    fs.writeFileSync(path.join(profileDir, 'Default', 'Network', 'Cookies-journal'), 'x');
    fs.writeFileSync(path.join(profileDir, 'Default', 'Preferences'), '{}');
    process.env.DKCL_HUE_PROFILE_DIR = profileDir;
    return { dir, profileDir };
}

function resetRegistry(source = 'HUE') {
    globalRegistry.delete(source);
}

function fakeClient(log) {
    return {
        async signOutAndClearCookies() { log.push('signOut'); },
        async close() { log.push('close'); },
        async isAuthenticated() { return true; },
        async isF13ReportReady() { return true; }
    };
}

function makeService(sandbox) {
    return new DkclSessionPreflightService({
        coordinatorEnabled: false,
        hueBrokerEnabled: false,
        disconnectFlags: new DkclDisconnectFlags({ dir: sandbox.dir })
    });
}

test('clearProfileCookies removes only the cookie files', () => {
    const sandbox = makeSandbox();
    const removed = clearProfileCookies(sandbox.profileDir);
    assert.deepEqual(removed.sort(), ['Default/Network/Cookies', 'Default/Network/Cookies-journal']);
    assert.ok(fs.existsSync(path.join(sandbox.profileDir, 'Default', 'Preferences')), 'other profile data is kept');
    assert.deepEqual(clearProfileCookies(sandbox.profileDir), [], 'nothing left to remove');
});

test('disconnect flags persist in a file and clear on demand', () => {
    const sandbox = makeSandbox();
    const flags = new DkclDisconnectFlags({ dir: sandbox.dir });
    assert.equal(flags.isSet('HUE'), false);
    flags.set('hue');
    assert.equal(new DkclDisconnectFlags({ dir: sandbox.dir }).isSet('HUE'), true, 'a new instance (restart) still sees it');
    assert.equal(flags.isSet('TCT'), false);
    flags.clear('HUE');
    assert.equal(flags.isSet('HUE'), false);
});

test('disconnect signs out, closes the window, wipes the cookies and marks the source', async () => {
    const sandbox = makeSandbox();
    resetRegistry();
    const service = makeService(sandbox);
    const calls = [];
    const entry = service.getRegistryState('HUE');
    Object.assign(entry, { client: fakeClient(calls), authenticated: true, backgroundReady: true, state: DKCL_LIFECYCLE_STATES.F13_READY, lifecycleState: DKCL_LIFECYCLE_STATES.F13_READY });

    const before = await service.getSessionStatus('HUE');
    assert.equal(before.status, 'SESSION_VALID');
    assert.equal(before.has_window, true);

    const result = await service.disconnect('HUE');
    assert.deepEqual(calls, ['signOut', 'close']);
    assert.equal(result.status, 'DISCONNECTED');
    assert.equal(result.was_signed_in, true);
    assert.equal(result.cookies_cleared, true);
    assert.equal(result.cookie_files_removed, 2);
    assert.equal(fs.existsSync(path.join(sandbox.profileDir, 'Default', 'Network', 'Cookies')), false);
    assert.equal(service.getInteractiveClient('HUE'), null);

    const after = await service.getSessionStatus('HUE');
    assert.equal(after.status, 'DISCONNECTED');
    assert.equal(after.disconnected, true);
    assert.equal(after.has_window, false);
});

test('after a disconnect: preflight opens no browser and reattach is refused', async () => {
    const sandbox = makeSandbox();
    resetRegistry();
    const service = makeService(sandbox);
    service.portalClientFactory = () => { throw new Error('no browser may be opened for a disconnected source'); };
    await service.disconnect('HUE');

    const probe = await service.preflight('HUE');
    assert.equal(probe.status, 'AUTHENTICATION_REQUIRED');
    assert.equal(probe.disconnected, true);
    assert.equal(probe.error.code, 'DISCONNECTED_BY_USER');

    assert.deepEqual(await service.reattachSession('HUE'), { attached: false, reason: 'DISCONNECTED_BY_USER' });
});

test('interactive sign-in clears the disconnected marker', async () => {
    const sandbox = makeSandbox();
    resetRegistry();
    const service = makeService(sandbox);
    await service.disconnect('HUE');
    assert.equal(service.isDisconnected('HUE'), true);
    service.interactiveClientFactory = () => { throw new Error('stop after the marker is cleared'); };
    await service.interactiveAuthenticate('HUE').catch(() => {});
    assert.equal(service.isDisconnected('HUE'), false);
    resetRegistry();
});

test('disconnect is refused while an import operation uses the session', async () => {
    const sandbox = makeSandbox();
    resetRegistry();
    const service = makeService(sandbox);
    const calls = [];
    Object.assign(service.getRegistryState('HUE'), { client: fakeClient(calls), authenticated: true, activeOperation: 'HUE_QUEUE_RUNNING' });
    await assert.rejects(() => service.disconnect('HUE'), (error) => error.code === 'SESSION_BUSY');
    assert.deepEqual(calls, [], 'nothing was touched');
    assert.equal(service.isDisconnected('HUE'), false);
    resetRegistry();
});

test('status of a source with no window is NOT_CHECKED, and a login in progress is reported', async () => {
    const sandbox = makeSandbox();
    resetRegistry();
    const service = makeService(sandbox);
    assert.equal((await service.getSessionStatus('HUE')).status, 'NOT_CHECKED');
    Object.assign(service.getRegistryState('HUE'), { state: DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN, lifecycleState: DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN });
    const status = await service.getSessionStatus('HUE');
    assert.equal(status.status, 'LOGIN_IN_PROGRESS');
    assert.equal(status.login_in_progress, true);
    await assert.rejects(() => service.getSessionStatus('XYZ'), (error) => error.code === 'INVALID_SOURCE');
    resetRegistry();
});

test('keep-alive reports DISCONNECTED and does not try to reattach', async () => {
    let reattached = 0;
    const service = {
        getInteractiveClient: () => null,
        isDisconnected: (source) => source === 'HUE',
        reattachSession: async () => { reattached += 1; return { attached: false, reason: 'NO' }; },
        preflight: async () => ({ status: 'SESSION_VALID' })
    };
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ka-'));
    const keepAlive = new DkclSessionKeepAlive({ sessionService: service, logDir, logger: {} });
    await keepAlive.tick();
    assert.equal(keepAlive.last.get('HUE').status, 'DISCONNECTED');
    assert.equal(keepAlive.last.get('TCT').status, 'NO_SESSION');
    assert.equal(reattached, 1, 'only TCT was looked at for reattach');
});

test('controller: status returns both sources, disconnect maps SESSION_BUSY to 409', async () => {
    const calls = [];
    const fakeService = {
        getSessionStatus: async (source) => ({ source, status: 'NOT_CHECKED' }),
        disconnect: async (source) => {
            if (source === 'TCT') { const error = new Error('busy'); error.code = 'SESSION_BUSY'; throw error; }
            calls.push(source);
            return { source, status: 'DISCONNECTED' };
        }
    };
    const controller = new DkclSharedOperationsController({ sessionPreflightService: fakeService });
    const reply = () => { const r = { code: null, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };

    const statusRes = reply();
    await controller.sessionStatus({ query: {} }, statusRes);
    assert.equal(statusRes.code, 200);
    assert.deepEqual(Object.keys(statusRes.body.data.sources), ['HUE', 'TCT']);

    const okRes = reply();
    await controller.disconnect({ body: { source: 'HUE' } }, okRes);
    assert.equal(okRes.code, 200);
    const busyRes = reply();
    await controller.disconnect({ body: { source: 'TCT' } }, busyRes);
    assert.equal(busyRes.code, 409);
    assert.equal(busyRes.body.error.code, 'SESSION_BUSY');
});

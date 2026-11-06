'use strict';

// A source that becomes SESSION_VALID wakes the queue lanes (live defect 2026-10-27: after the sessions expired overnight and a
// sign-in at 07:32, the 07:30 daily import stayed idle until someone pressed "Tiếp tục Run").
// Run per file: node --test --experimental-sqlite test_dkclSessionKeepAliveWake.js

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const { DkclSessionKeepAlive } = require('./src/services/dkclSessionKeepAlive');

function fakeService(states) {
    return {
        getInteractiveClient: (source) => (states[source] === 'NO_SESSION' ? null : { source }),
        isDisconnected: () => false,
        reattachSession: async () => ({ attached: false }),
        preflight: async (source) => ({ status: states[source] }),
    };
}

function makeKeepAlive(states, onSessionValid) {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ka-wake-'));
    return new DkclSessionKeepAlive({ sessionService: fakeService(states), onSessionValid, logDir, logger: { log() {} } });
}

test('the queue is woken when a source becomes valid, once per change, not on every tick', async () => {
    const woken = [];
    const states = { HUE: 'NO_SESSION', TCT: 'AUTHENTICATION_REQUIRED' };
    const keepAlive = makeKeepAlive(states, (source) => woken.push(source));
    await keepAlive.tick();
    assert.deepEqual(woken, [], 'no wake while the sessions are missing');
    states.HUE = 'SESSION_VALID';
    await keepAlive.tick();
    assert.deepEqual(woken, ['HUE']);
    await keepAlive.tick();
    assert.deepEqual(woken, ['HUE'], 'a source that stays valid does not wake the queue again');
    states.TCT = 'SESSION_VALID';
    await keepAlive.tick();
    assert.deepEqual(woken, ['HUE', 'TCT']);
    states.HUE = 'NO_SESSION';
    await keepAlive.tick();
    states.HUE = 'SESSION_VALID';
    await keepAlive.tick();
    assert.deepEqual(woken, ['HUE', 'TCT', 'HUE'], 'coming back after an expiry wakes the queue again');
});

test('the first look after a restart finds a valid session: the queue is woken', async () => {
    const woken = [];
    const keepAlive = makeKeepAlive({ HUE: 'SESSION_VALID', TCT: 'SESSION_VALID' }, (source) => woken.push(source));
    await keepAlive.tick();
    assert.deepEqual(woken, ['HUE', 'TCT']);
});

test('a failing wake never disturbs the keep-alive, and a missing hook is fine', async () => {
    const throwing = makeKeepAlive({ HUE: 'SESSION_VALID', TCT: 'SESSION_VALID' }, () => { throw new Error('boom'); });
    const changes = await throwing.tick();
    assert.equal(changes.length, 2);
    const plain = makeKeepAlive({ HUE: 'SESSION_VALID', TCT: 'SESSION_VALID' }, null);
    assert.equal((await plain.tick()).length, 2);
});

test('a source that could not be re-attached after a start is looked at again quickly (bounded), the reason is logged', async () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ka-retry-'));
    let attempts = 0;
    const service = {
        getInteractiveClient: () => null,
        isDisconnected: () => false,
        reattachSession: async () => { attempts += 1; return { attached: false, reason: 'AUTHENTICATION_REQUIRED' }; },
        preflight: async () => ({ status: 'SESSION_VALID' }),
    };
    const keepAlive = new DkclSessionKeepAlive({
        sessionService: service, logDir, logger: { log() {} }, env: { DKCL_REATTACH_COOLDOWN_MS: '0' }, startupRetryMs: 5, startupRetryLimit: 3,
    });
    await keepAlive.tick();
    await new Promise((resolve) => setTimeout(resolve, 150));
    keepAlive.stop();
    assert.equal(keepAlive.startupRetries, 3, 'bounded: three quick retries, then the regular interval takes over');
    assert.ok(attempts >= 4 && attempts <= 8, `attempts=${attempts}`);
    const log = fs.readFileSync(path.join(logDir, 'session-watch.log'), 'utf8');
    assert.match(log, /saved session not re-attached \(AUTHENTICATION_REQUIRED\)/);
});

// IMPORT-AUTH-RESUME-01 (2026-11-06): the keep-alive saw TCT valid from 07:20, the 07:30 job found the portal page gone and
// parked the run in WAITING_AUTH, the PO signed in again -- no status change, so nothing resumed the 16 TCT days.
test('a source that stays valid resumes the runs still waiting for its sign-in, logged only when one was resumed', async () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ka-still-'));
    const woken = [];
    const stillValid = [];
    let waiting = [];
    const keepAlive = new DkclSessionKeepAlive({
        sessionService: fakeService({ HUE: 'SESSION_VALID', TCT: 'SESSION_VALID' }),
        onSessionValid: (source) => woken.push(source),
        onSessionStillValid: async (source) => { stillValid.push(source); if (source !== 'TCT') return []; const ids = waiting; waiting = []; return ids; },
        logDir,
        logger: { log() {} },
    });
    await keepAlive.tick();
    assert.deepEqual(woken, ['HUE', 'TCT']);
    assert.deepEqual(stillValid, [], 'a change goes through onSessionValid only');
    waiting = ['7198e644'];
    await keepAlive.tick();
    assert.deepEqual(stillValid, ['HUE', 'TCT']);
    assert.deepEqual(woken, ['HUE', 'TCT'], 'no extra change-wake');
    await keepAlive.tick();
    const lines = fs.readFileSync(path.join(logDir, 'session-watch.log'), 'utf8').split('\n').filter((line) => line.includes('still valid'));
    assert.equal(lines.length, 1, 'one log line, for the tick that resumed a run');
    assert.match(lines[0], /TCT still valid: 1 run\(s\) waiting for a sign-in resumed/);
});

test('a failing still-valid resume is logged and never disturbs the keep-alive', async () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ka-still-fail-'));
    const keepAlive = new DkclSessionKeepAlive({
        sessionService: fakeService({ HUE: 'SESSION_VALID', TCT: 'SESSION_VALID' }),
        onSessionStillValid: async () => { const error = new Error('busy'); error.code = 'SQLITE_BUSY'; throw error; },
        logDir,
        logger: { log() {} },
    });
    await keepAlive.tick();
    await keepAlive.tick();
    assert.match(fs.readFileSync(path.join(logDir, 'session-watch.log'), 'utf8'), /still valid: resume failed \(SQLITE_BUSY\)/);
});

test('a finished manual sign-in notifies the sign-in-ready listeners with the source', async () => {
    const { DkclSessionPreflightService, onInteractiveLoginReady } = require('./src/services/dkclSessionPreflightService');
    const service = new DkclSessionPreflightService();
    service.transitionEntry = () => {};
    service.hideWindowIfVisible = async () => {};
    const seen = [];
    const off = onInteractiveLoginReady((source) => seen.push(source));
    const offThrowing = onInteractiveLoginReady(() => { throw new Error('listener boom'); });
    try {
        await service.awaitInteractiveLogin({ source: 'TCT' }, {}, { waitInteractiveAuthentication: async () => {} }, 'profile');
        assert.deepEqual(seen, ['TCT']);
        const failing = { waitInteractiveAuthentication: async () => { const e = new Error('timeout'); e.code = 'AUTHENTICATION_REQUIRED'; throw e; }, close: async () => {} };
        await service.awaitInteractiveLogin({ source: 'HUE', displayName: 'Huế' }, {}, failing, 'profile');
        assert.deepEqual(seen, ['TCT'], 'a sign-in that timed out does not notify');
    } finally {
        off();
        offThrowing();
    }
});

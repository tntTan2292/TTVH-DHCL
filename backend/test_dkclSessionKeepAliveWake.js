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

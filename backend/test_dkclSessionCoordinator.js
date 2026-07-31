'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { DkclSessionStore } = require('./src/services/dkclSessionStore');
const { DkclSessionCoordinator } = require('./src/services/dkclSessionCoordinator');
const { DKCL_LIFECYCLE_STATES } = require('./src/services/dkclLifecycleContract');

(async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dkcl-coordinator-'));
    const storePath = path.join(tmpRoot, 'session-store.json');

    console.log('\nTEST 1: store writes and reads atomically');
    const store = new DkclSessionStore({ filePath: storePath });
    store.clearAll();
    store.upsertSession('HUE', {
        sessionId: 'session-hue',
        state: DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN,
        profileDir: 'C:\\profiles\\HUE'
    });
    const session = store.getSession('HUE');
    assert.strictEqual(session.sessionId, 'session-hue');
    assert.strictEqual(session.state, DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN);

    console.log('\nTEST 2: coordinator tracks shared state model');
    const coordinator = new DkclSessionCoordinator({
        store,
        backendInstanceId: 'backend-a'
    });
    coordinator.beginOpening('TCT', 'C:\\profiles\\TCT');
    coordinator.recordState('TCT', {
        state: DKCL_LIFECYCLE_STATES.WAITING_FOR_LOGIN,
        sourcePageReady: false,
        authenticated: false
    });
    coordinator.recordState('TCT', {
        state: DKCL_LIFECYCLE_STATES.AUTHENTICATED,
        authenticated: true
    });
    coordinator.recordState('TCT', {
        state: DKCL_LIFECYCLE_STATES.F13_READY,
        authenticated: true,
        sourcePageReady: true
    });
    const tct = coordinator.getSession('TCT');
    assert.strictEqual(tct.state, DKCL_LIFECYCLE_STATES.F13_READY);
    assert.strictEqual(tct.authenticated, true);
    assert.strictEqual(tct.sourcePageReady, true);

    console.log('\nTEST 3: restart-safe recovery only trusts exact profile match + durable record');
    const recoverable = coordinator.canRecover(
        tct,
        'C:\\profiles\\TCT',
        { matchingProcesses: [{ pid: 5000, exactProfileMatch: true }] }
    );
    const notRecoverable = coordinator.canRecover(
        tct,
        'C:\\profiles\\OTHER',
        { matchingProcesses: [{ pid: 5000, exactProfileMatch: true }] }
    );
    assert.strictEqual(recoverable, true);
    assert.strictEqual(notRecoverable, false);

    console.log('\nRESULT: dkclSessionCoordinator checks passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});

'use strict';

const http = require('http');
const assert = require('assert');
const { DkclHueBrowserBroker } = require('./src/services/dkclHueBrowserBroker');
const { createBrokerApp } = require('./src/services/dkclHueBrokerServer');
const { DkclSessionPreflightService } = require('./src/services/dkclSessionPreflightService');
const { DkclHueF13BackfillService } = require('./src/services/dkclHueF13BackfillService');

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function waitFor(predicate, timeoutMs = 2000) {
    const timeoutAt = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const tick = async () => {
            try {
                if (await predicate()) return resolve();
                if (Date.now() >= timeoutAt) return reject(new Error('Timed out waiting for condition.'));
                setTimeout(tick, 20);
            } catch (error) {
                reject(error);
            }
        };
        tick();
    });
}

class FakePortalClient {
    constructor(sharedState) {
        this.sharedState = sharedState;
        this.interactiveAuthenticatedOnOpen = false;
        this.onDisconnect = null;
    }

    async prepareInteractiveAuthentication() {
        this.sharedState.prepareCalls += 1;
    }

    async waitInteractiveAuthentication() {
        this.sharedState.waitCalls += 1;
        await this.sharedState.waitForLogin.promise;
    }

    async isAuthenticated() {
        return this.sharedState.authenticated;
    }

    async isF13ReportReady() {
        return this.sharedState.ready;
    }

    async restoreWindow() {
        this.sharedState.restoreCalls += 1;
        if (this.sharedState.restoreShouldThrow) {
            throw new Error('restore failed');
        }
        return true;
    }

    async close() {
        this.sharedState.closeCalls += 1;
        this.sharedState.closed = true;
    }
}

async function startServer(app) {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    return {
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    };
}

async function testBrokerStateMachine() {
    const shared = {
        prepareCalls: 0,
        waitCalls: 0,
        restoreCalls: 0,
        closeCalls: 0,
        closed: false,
        authenticated: false,
        ready: false,
        restoreShouldThrow: false,
        waitForLogin: deferred()
    };

    const broker = new DkclHueBrowserBroker({
        clientFactory: () => new FakePortalClient(shared),
        logger: { log() {} }
    });

    const opening = await broker.openLogin();
    assert.strictEqual(opening.status, 'LOGIN_IN_PROGRESS');
    assert.strictEqual(shared.prepareCalls, 1);
    assert.strictEqual(shared.waitCalls, 1);

    let status = await broker.getStatus();
    assert.strictEqual(status.status, 'LOGIN_IN_PROGRESS');
    assert.strictEqual(status.source_page_ready, false);

    shared.authenticated = true;
    shared.ready = true;
    shared.waitForLogin.resolve();
    await waitFor(async () => (await broker.getStatus()).status === 'SESSION_VALID');

    status = await broker.getStatus();
    assert.strictEqual(status.status, 'SESSION_VALID');
    assert.strictEqual(status.source_page_ready, true);

    shared.restoreShouldThrow = true;
    const reused = await broker.openLogin();
    assert.strictEqual(reused.status, 'SESSION_VALID');

    const ready = await broker.getSessionReady();
    assert.strictEqual(ready.ready, true);

    const closed = await broker.close();
    assert.strictEqual(closed.closed, true);
    assert.strictEqual(shared.closeCalls, 1);
}

async function testBackendRestartRecoveryViaBroker() {
    const shared = {
        prepareCalls: 0,
        waitCalls: 0,
        restoreCalls: 0,
        closeCalls: 0,
        closed: false,
        authenticated: false,
        ready: false,
        restoreShouldThrow: false,
        waitForLogin: deferred()
    };

    const broker = new DkclHueBrowserBroker({
        clientFactory: () => new FakePortalClient(shared),
        logger: { log() {} }
    });
    const { app } = createBrokerApp({ broker });
    const runtime = await startServer(app);

    try {
        const serviceBeforeRestart = new DkclSessionPreflightService({
            hueBrokerEnabled: true,
            hueBrokerClientOptions: { baseUrl: runtime.baseUrl },
            portalClientFactory: () => { throw new Error('legacy portal client should not be used for HUE broker'); },
            interactiveClientFactory: () => { throw new Error('legacy interactive client should not be used for HUE broker'); }
        });

        const interactive = await serviceBeforeRestart.interactiveAuthenticate('HUE');
        assert.strictEqual(interactive.status, 'LOGIN_IN_PROGRESS');
        assert.strictEqual(shared.prepareCalls, 1);

        shared.authenticated = true;
        shared.ready = true;
        shared.waitForLogin.resolve();

        await waitFor(async () => (await serviceBeforeRestart.preflight('HUE')).status === 'SESSION_VALID');

        const serviceAfterRestart = new DkclSessionPreflightService({
            hueBrokerEnabled: true,
            hueBrokerClientOptions: { baseUrl: runtime.baseUrl }
        });

        const recovered = await serviceAfterRestart.preflight('HUE');
        assert.strictEqual(recovered.status, 'SESSION_VALID');
        assert.strictEqual(recovered.source_page_ready, true);

        const cancelled = await serviceAfterRestart.cancelInteractiveLogin('HUE');
        assert.strictEqual(cancelled.status, 'AUTHENTICATION_REQUIRED');
        assert.strictEqual(shared.closeCalls, 1);
    } finally {
        await runtime.close();
    }
}

async function testHueQueueGuardWhenBrokerEnabled() {
    const originalFlag = process.env.DKCL_HUE_BROKER_ENABLED;
    process.env.DKCL_HUE_BROKER_ENABLED = 'true';

    try {
        const service = new DkclHueF13BackfillService({
            syncService: {},
            sessionPreflightService: {
                preflight: async () => ({ status: 'SESSION_VALID' }),
                getInteractiveClient: () => ({})
            }
        });

        await assert.rejects(
            () => service.validateAuthenticationBeforeQueue(),
            (error) => error.code === 'HUE_BROKER_EXPORT_NOT_IMPLEMENTED'
        );
    } finally {
        if (typeof originalFlag === 'undefined') {
            delete process.env.DKCL_HUE_BROKER_ENABLED;
        } else {
            process.env.DKCL_HUE_BROKER_ENABLED = originalFlag;
        }
    }
}

async function main() {
    await testBrokerStateMachine();
    await testBackendRestartRecoveryViaBroker();
    await testHueQueueGuardWhenBrokerEnabled();
    console.log('PASS test_dkclHueBrowserBroker');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

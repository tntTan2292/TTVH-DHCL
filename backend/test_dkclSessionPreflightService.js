'use strict';

const assert = require('assert');
const {
    DkclSessionPreflightService,
    PREFLIGHT_STATUSES,
    SOURCE_CONFIG
} = require('./src/services/dkclSessionPreflightService');

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

(async () => {
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

    console.log('\nTEST 4: interactive browser stays open only after F1.3 readiness');
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
    assert(interactiveCalls.some((call) => call[0] === 'minimize'), 'browser minimizes only after readiness');
    const activePreflight = await interactiveService.preflight('TCT');
    assert.strictEqual(activePreflight.status, PREFLIGHT_STATUSES.SESSION_VALID, 'active browser preflight remains valid without opening another process');
    assert.strictEqual(interactiveCalls.filter((call) => call[0] === 'open').length, 1, 'repeated preflight does not launch a duplicate browser');

    console.log('\nRESULT: dkclSessionPreflightService checks passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});

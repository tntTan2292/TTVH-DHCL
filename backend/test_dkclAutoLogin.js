'use strict';

// AUTO-LOGIN-01: unattended DKCL sign-in (one rate-limited attempt before the manual wait).
// Run per file: node --test --experimental-sqlite test_dkclAutoLogin.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DkclAutoLoginService } = require('./src/services/dkclAutoLoginService');
const { DkclHueF13PortalClient } = require('./src/services/dkclHueF13PortalClient');
const { DkclSessionPreflightService, globalRegistry, DKCL_LIFECYCLE_STATES } = require('./src/services/dkclSessionPreflightService');
const browserProcessManager = require('./src/services/browserProcessManager');

browserProcessManager.findBrowserProcessByProfile = async () => ({ inspectionStatus: 'SUCCESS', matchingProcesses: [], errorCode: null });
browserProcessManager.terminateProcessTree = async () => {};
browserProcessManager.cleanupStaleLocks = () => {};

const SECRET = 'S3cret-Value-Do-Not-Log';
const silentLogger = (lines = []) => ({ log: (m) => lines.push(String(m)), warn: (m) => lines.push(String(m)) });

function makeService(env, options = {}) {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-login-'));
    const lines = [];
    let now = options.now || 1_000_000;
    const service = new DkclAutoLoginService({
        env: {
            DKCL_AUTO_LOGIN_HUE_ENABLED: 'true',
            PORTAL_HUE_USERNAME: 'hue.user',
            PORTAL_HUE_PASSWORD: SECRET,
            PORTAL_HUE_HRM_CODE: '12345',
            ...env,
        },
        stateDir,
        clock: () => now,
        logger: silentLogger(lines),
    });
    return { service, stateDir, lines, advance: (ms) => { now += ms; }, cleanup: () => fs.rmSync(stateDir, { recursive: true, force: true }) };
}

test('off by default, per source, and needs the credentials the source requires', () => {
    const off = makeService({ DKCL_AUTO_LOGIN_HUE_ENABLED: undefined });
    assert.deepEqual(off.service.check('HUE'), { allowed: false, reason: 'DISABLED' });
    off.cleanup();

    const noHrm = makeService({ PORTAL_HUE_HRM_CODE: undefined });
    assert.deepEqual(noHrm.service.check('HUE'), { allowed: false, reason: 'CREDENTIALS_MISSING' }, 'HUE needs the HRM code');
    noHrm.cleanup();

    const tct = makeService({ DKCL_AUTO_LOGIN_TCT_ENABLED: 'true', PORTAL_NATIONAL_USERNAME: 'tct.user', PORTAL_NATIONAL_PASSWORD: SECRET });
    assert.equal(tct.service.check('TCT').allowed, true, 'TCT does not need an HRM code');
    assert.deepEqual(tct.service.check('XYZ'), { allowed: false, reason: 'DISABLED' });
    tct.cleanup();
});

test('one attempt per interval, and a streak of failures stops further attempts until a login succeeds', async () => {
    const { service, advance, cleanup } = makeService({ DKCL_AUTO_LOGIN_MIN_INTERVAL_MS: '1000', DKCL_AUTO_LOGIN_MAX_FAILURES: '2' });
    try {
        let calls = 0;
        const failing = { async tryAutomatedLogin() { calls += 1; return { authenticated: false, reason: 'NOT_AUTHENTICATED_AFTER_SUBMIT' }; } };
        const first = await service.attempt('HUE', failing);
        assert.deepEqual([first.attempted, first.authenticated, first.reason], [true, false, 'NOT_AUTHENTICATED_AFTER_SUBMIT']);

        const tooSoon = await service.attempt('HUE', failing);
        assert.deepEqual([tooSoon.attempted, tooSoon.reason], [false, 'TOO_SOON']);
        assert.equal(calls, 1);

        advance(1500);
        await service.attempt('HUE', failing);
        assert.equal(calls, 2);

        advance(1500);
        const blocked = await service.attempt('HUE', failing);
        assert.deepEqual([blocked.attempted, blocked.reason], [false, 'TOO_MANY_FAILURES'], 'two failures in a row: no more attempts');
        assert.equal(calls, 2);

        service.recordSuccess('HUE'); // a manual login worked
        advance(1500);
        const ok = await service.attempt('HUE', { async tryAutomatedLogin() { return { authenticated: true, reason: 'LOGGED_IN' }; } });
        assert.deepEqual([ok.attempted, ok.authenticated], [true, true]);
        assert.equal(service.readState('HUE').consecutiveFailures, 0);
    } finally { cleanup(); }
});

test('attempt counters survive a restart; a crash during an attempt still counts; secrets are never logged', async () => {
    const { service, stateDir, lines, cleanup } = makeService({ DKCL_AUTO_LOGIN_MIN_INTERVAL_MS: '60000' });
    try {
        await assert.doesNotReject(service.attempt('HUE', { async tryAutomatedLogin() { throw Object.assign(new Error(`boom ${SECRET}`), { code: 'ATTEMPT_ERROR' }); } }));
        const restarted = new DkclAutoLoginService({ env: service.env, stateDir, clock: () => 1_000_100, logger: silentLogger() });
        assert.equal(restarted.check('HUE').reason, 'TOO_SOON', 'a new process still knows the last attempt');
        assert.equal(restarted.readState('HUE').consecutiveFailures, 1);
        assert.ok(lines.every((line) => !line.includes(SECRET) && !line.includes('hue.user')), 'no credential value in any log line');
        assert.ok(!fs.readFileSync(service.statePath('HUE'), 'utf8').includes(SECRET), 'the state file holds no secret');
    } finally { cleanup(); }
});

function fakePage({ bodies, authenticatedAfter = 1, hasFields = true }) {
    const filled = [];
    let polls = 0;
    let bodyIndex = 0;
    const page = {
        filled,
        gotoCalls: [],
        isClosed: () => false,
        url: () => 'https://dkcl.vnpost.vn/login',
        async goto(url) { this.gotoCalls.push(url); },
        async waitForTimeout() { await new Promise((r) => setTimeout(r, 2)); polls += 1; if (bodyIndex < bodies.length - 1) bodyIndex += 1; },
        async waitForLoadState() {},
        locator(selector) {
            if (selector === 'body') return { innerText: async () => bodies[bodyIndex] };
            const isPassword = selector.includes('password');
            const isSubmit = selector.includes('submit');
            return {
                first() { return this; },
                async count() { return hasFields ? 1 : 0; },
                async fill(value) { filled.push([isPassword ? 'password' : 'text', value]); },
                async click() {},
                async textContent() { return null; },
            };
        },
    };
    page.polls = () => polls;
    page.authenticated = () => polls >= authenticatedAfter;
    return page;
}

function clientWith(page) {
    const client = new DkclHueF13PortalClient({ source: 'HUE', logger: silentLogger() });
    client.page = page;
    client.baseUrl = 'https://dkcl.vnpost.vn';
    client.isAuthenticated = async () => page.authenticated();
    client.fillHrmIdentifierIfPresent = async (code) => { page.filled.push(['hrm', code]); };
    return client;
}

test('tryAutomatedLogin signs in, fills the HRM code only when asked, and uses its one attempt', async () => {
    const page = fakePage({ bodies: ['Đăng nhập', 'Nhập mã nhân viên HRM', 'Trang chủ'], authenticatedAfter: 3 });
    const client = clientWith(page);
    const result = await client.tryAutomatedLogin({ username: 'u', password: 'p', hrmCode: '777', waitMs: 20000 });
    assert.deepEqual([result.authenticated, result.reason], [true, 'LOGGED_IN']);
    assert.deepEqual(page.filled.map((entry) => entry[0]), ['text', 'password', 'hrm']);
    const again = await client.tryAutomatedLogin({ username: 'u', password: 'p', hrmCode: '777' });
    assert.equal(again.authenticated, true, 'already signed in: reported as such without a second attempt');
});

test('tryAutomatedLogin stops at a CAPTCHA / OTP page and when the form is missing; it never throws', async () => {
    const captcha = fakePage({ bodies: ['Vui lòng nhập CAPTCHA'], authenticatedAfter: 1e9 });
    const stopped = await clientWith(captcha).tryAutomatedLogin({ username: 'u', password: 'p' });
    assert.deepEqual([stopped.authenticated, stopped.reason], [false, 'SECURITY_CHALLENGE']);
    assert.equal(captcha.filled.length, 0, 'nothing is typed on a challenge page');

    const noForm = fakePage({ bodies: ['Đăng nhập'], authenticatedAfter: 1e9, hasFields: false });
    const missing = await clientWith(noForm).tryAutomatedLogin({ username: 'u', password: 'p' });
    assert.deepEqual([missing.authenticated, missing.reason], [false, 'LOGIN_FORM_NOT_FOUND']);

    const wrong = fakePage({ bodies: ['Đăng nhập', 'Sai mật khẩu'], authenticatedAfter: 1e9 });
    const rejected = await clientWith(wrong).tryAutomatedLogin({ username: 'u', password: 'p', waitMs: 30 });
    assert.deepEqual([rejected.authenticated, rejected.reason], [false, 'NOT_AUTHENTICATED_AFTER_SUBMIT']);
});

test('interactive flow: the automatic attempt runs before the manual wait; failure keeps the manual path', async () => {
    for (const succeeds of [true, false]) {
        globalRegistry.clear();
        const order = [];
        const client = {
            interactiveAuthenticatedOnOpen: false,
            async prepareInteractiveAuthentication() { order.push('prepare'); },
            async waitInteractiveAuthentication() { order.push('wait'); },
            async isF13ReportReady() { return true; },
            async hideWindow() { return true; },
            async restoreWindow() { return true; },
            async close() {},
        };
        const autoLogin = {
            async attempt(source) { order.push(`attempt:${source}`); return { attempted: true, authenticated: succeeds }; },
            recordSuccess(source) { order.push(`success:${source}`); },
        };
        const service = new DkclSessionPreflightService({ interactiveClientFactory: () => client, autoLoginService: autoLogin, coordinatorEnabled: false });
        await service.interactiveAuthenticate('TCT');
        await new Promise((resolve) => setTimeout(resolve, 80));
        assert.deepEqual(order, ['prepare', 'attempt:TCT', 'wait', 'success:TCT'], 'attempt first, then the usual wait either way');
        assert.equal(service.getRegistryState('TCT').state, DKCL_LIFECYCLE_STATES.F13_READY);
    }

    // already signed in when the window opened: no attempt at all
    globalRegistry.clear();
    const order = [];
    const openedSignedIn = {
        interactiveAuthenticatedOnOpen: true,
        async prepareInteractiveAuthentication() {},
        async waitInteractiveAuthentication() { order.push('wait'); },
        async isF13ReportReady() { return true; },
        async hideWindow() { return true; },
        async restoreWindow() { return true; },
        async close() {},
    };
    const service = new DkclSessionPreflightService({
        interactiveClientFactory: () => openedSignedIn,
        autoLoginService: { async attempt() { order.push('attempt'); return {}; }, recordSuccess() {} },
        coordinatorEnabled: false,
    });
    await service.interactiveAuthenticate('HUE');
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.deepEqual(order, ['wait']);
});

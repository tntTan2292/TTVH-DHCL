'use strict';

// AUTO-LOGIN-01 Part B: scheduled automatic import.
// Run per file: node --test --experimental-sqlite test_autoImportScheduler.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AutoImportScheduler, parseTimes } = require('./src/services/autoImportScheduler');

const silent = { log() {}, warn() {}, error() {} };

// 2026-10-20 08:40 in Vietnam is 01:40 UTC
const at = (hhmm, day = '2026-10-20') => new Date(`${day}T${hhmm}:00+07:00`);

function build({ env = {}, now = at('08:40'), sessions = {}, autoLogin = null, queue = null } = {}) {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-import-'));
    const calls = [];
    let clockNow = now;
    const sessionService = {
        async preflight(source) {
            calls.push(['preflight', source]);
            const plan = sessions[source] || ['SESSION_VALID'];
            return { status: plan.length > 1 ? plan.shift() : plan[0] };
        },
        async interactiveAuthenticate(source) { calls.push(['interactive', source]); },
    };
    const queueService = queue || {
        async createRun(args) { calls.push(['createRun', args]); return { run: { id: `run-${args.lane}` }, jobs: [1, 2], creation: { created: true } }; },
    };
    const scheduler = new AutoImportScheduler({
        queueService,
        sessionService,
        autoLogin: autoLogin || { check: () => ({ allowed: false, reason: 'DISABLED' }) },
        env: { AUTO_IMPORT_SCHEDULE_ENABLED: 'true', AUTO_IMPORT_SCHEDULE_TIMES: '08:30', ...env },
        clock: () => clockNow,
        stateDir,
        logger: silent,
        sleep: async () => { clockNow = new Date(clockNow.getTime() + 5000); },
    });
    return { scheduler, calls, stateDir, setNow: (value) => { clockNow = value; }, cleanup: () => fs.rmSync(stateDir, { recursive: true, force: true }) };
}

test('times are parsed, sorted and validated', () => {
    assert.deepEqual(parseTimes('13:00, 8:30,25:00,abc,08:30'), ['08:30', '13:00']);
    assert.deepEqual(parseTimes(undefined), ['08:30']);
});

test('off unless enabled; a slot runs once a day, only inside the catch-up window', async () => {
    const off = build({ env: { AUTO_IMPORT_SCHEDULE_ENABLED: 'false' } });
    assert.equal(await off.scheduler.tick(), null);
    off.cleanup();

    const t = build();
    try {
        assert.equal(t.scheduler.dueSlot(at('08:29')), null, 'before the time');
        assert.deepEqual(t.scheduler.dueSlot(at('08:30')), { day: '2026-10-20', time: '08:30' });
        assert.equal(t.scheduler.dueSlot(at('11:31')), null, 'more than 3 hours late is skipped');

        const report = await t.scheduler.tick();
        assert.ok(report);
        assert.equal(t.scheduler.dueSlot(at('08:45')), null, 'fired today: not again');
        assert.equal(await t.scheduler.tick(), null);
        assert.deepEqual(t.scheduler.dueSlot(at('08:35', '2026-10-21')), { day: '2026-10-21', time: '08:30' }, 'the next day fires again');
    } finally { t.cleanup(); }
});

test('a restart never repeats a fired slot (state is saved before the work)', async () => {
    const first = build();
    try {
        await first.scheduler.tick();
        const second = new AutoImportScheduler({
            queueService: {}, sessionService: {}, autoLogin: {},
            env: { AUTO_IMPORT_SCHEDULE_ENABLED: 'true', AUTO_IMPORT_SCHEDULE_TIMES: '08:30' },
            clock: () => at('08:50'), stateDir: first.stateDir, logger: silent,
        });
        assert.equal(second.dueSlot(), null);
    } finally { first.cleanup(); }
});

test('valid sessions get one run per lane requested by the scheduler; no other work is started', async () => {
    const t = build();
    try {
        const report = await t.scheduler.runOnce('test');
        assert.deepEqual(report.sources.HUE, { outcome: 'RUN_CREATED', runId: 'run-HUE', jobs: 2 });
        assert.equal(report.sources.TCT.outcome, 'RUN_CREATED');
        const runs = t.calls.filter((call) => call[0] === 'createRun').map((call) => call[1]);
        assert.deepEqual(runs, [
            { lane: 'HUE', actor: 'scheduler', roles: ['admin'] },
            { lane: 'TCT', actor: 'scheduler', roles: ['admin'] },
        ]);
        assert.ok(!t.calls.some((call) => call[0] === 'interactive'), 'a valid session never opens a login');
    } finally { t.cleanup(); }
});

test('expired session: signs in automatically when allowed, otherwise skips that lane and leaves the other alone', async () => {
    const allowed = { check: () => ({ allowed: true, reason: null }) };
    const t = build({ sessions: { HUE: ['AUTHENTICATION_REQUIRED', 'LOGIN_IN_PROGRESS', 'SESSION_VALID'] }, autoLogin: allowed });
    try {
        const report = await t.scheduler.runOnce('test');
        assert.equal(report.sources.HUE.outcome, 'RUN_CREATED');
        assert.ok(t.calls.some((call) => call[0] === 'interactive' && call[1] === 'HUE'));
    } finally { t.cleanup(); }

    const blocked = build({ sessions: { HUE: ['AUTHENTICATION_REQUIRED'] }, autoLogin: { check: () => ({ allowed: false, reason: 'TOO_MANY_FAILURES' }) } });
    try {
        const report = await blocked.scheduler.runOnce('test');
        assert.deepEqual(report.sources.HUE, { outcome: 'SKIPPED_NEEDS_MANUAL_LOGIN', reason: 'TOO_MANY_FAILURES' });
        assert.equal(report.sources.TCT.outcome, 'RUN_CREATED', 'the other lane is not held back');
        assert.ok(!blocked.calls.some((call) => call[0] === 'createRun' && call[1].lane === 'HUE'));
        assert.ok(!blocked.calls.some((call) => call[0] === 'interactive'));
    } finally { blocked.cleanup(); }

    const never = build({ env: { AUTO_IMPORT_SCHEDULE_SESSION_WAIT_MS: '10000' }, sessions: { TCT: ['AUTHENTICATION_REQUIRED', 'LOGIN_IN_PROGRESS'] }, autoLogin: allowed });
    try {
        const report = await never.scheduler.runOnce('test');
        assert.deepEqual(report.sources.TCT, { outcome: 'SKIPPED_SESSION_NOT_READY', reason: 'LOGIN_IN_PROGRESS' });
        assert.equal(report.sources.HUE.outcome, 'RUN_CREATED');
    } finally { never.cleanup(); }
});

test('nothing to import and a run already open are reported, not treated as errors', async () => {
    const none = build({ queue: { async createRun() { throw Object.assign(new Error('x'), { code: 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE' }); } } });
    try {
        const report = await none.scheduler.runOnce('test');
        assert.equal(report.sources.HUE.outcome, 'NOTHING_TO_IMPORT');
    } finally { none.cleanup(); }

    const dup = build({ queue: { async createRun() { return { run: { id: 'r' }, jobs: [], creation: { created: false } }; } } });
    try {
        assert.equal((await dup.scheduler.runOnce('test')).sources.TCT.outcome, 'RUN_ALREADY_OPEN');
    } finally { dup.cleanup(); }

    const broken = build({ queue: { async createRun() { throw Object.assign(new Error('db down'), { code: 'SQLITE_BUSY' }); } } });
    try {
        assert.deepEqual((await broken.scheduler.runOnce('test')).sources.HUE, { outcome: 'FAILED', reason: 'SQLITE_BUSY' });
    } finally { broken.cleanup(); }
});

test('two runs never overlap', async () => {
    const t = build();
    try {
        const first = t.scheduler.runOnce('a');
        const second = await t.scheduler.runOnce('b');
        assert.equal(second, null);
        await first;
    } finally { t.cleanup(); }
});

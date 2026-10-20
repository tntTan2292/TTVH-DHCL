'use strict';

// AUTO-IMPORT-SCHEDULE-01: scheduled import with hourly retries, and the DKCL session keep-alive.
// Run per file: node --test --experimental-sqlite test_autoImportScheduler.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AutoImportScheduler, parseTimes, parseLanes } = require('./src/services/autoImportScheduler');
const { DkclSessionKeepAlive } = require('./src/services/dkclSessionKeepAlive');

const silent = { log() {}, warn() {}, error() {} };
const HOUR = 60 * 60 * 1000;

// Vietnam clock: 07:30 on 2026-10-21 is 00:30 UTC
const at = (hhmm, day = '2026-10-21') => new Date(`${day}T${hhmm}:00+07:00`);

/**
 * sessions: { LANE: status or [statuses over successive checks] }
 * runStatuses: { runId: status or [statuses over successive reads] }
 */
function build({ env = {}, now = at('07:30'), sessions = {}, runStatuses = {}, createRun = null } = {}) {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-import-'));
    const calls = [];
    let clockNow = now;
    let runCounter = 0;
    const pick = (table, key, fallback) => {
        const plan = table[key];
        if (Array.isArray(plan)) return plan.length > 1 ? plan.shift() : plan[0];
        return plan || fallback;
    };
    const sessionService = {
        async preflight(lane) { calls.push(['preflight', lane]); return { status: pick(sessions, lane, 'SESSION_VALID') }; },
    };
    const queueService = {
        async createRun(args) {
            calls.push(['createRun', args]);
            if (createRun) return createRun(args);
            runCounter += 1;
            return { run: { id: `run-${args.lane}-${runCounter}` }, jobs: [1, 2], creation: { created: true } };
        },
        store: { async getRun(id) { return { run: { status: pick(runStatuses, id, 'COMPLETED') } }; } },
    };
    const scheduler = new AutoImportScheduler({
        queueService,
        sessionService,
        env: { AUTO_IMPORT_SCHEDULE_ENABLED: 'true', ...env },
        clock: () => clockNow,
        stateDir,
        logger: silent,
    });
    return {
        scheduler, calls, stateDir,
        setNow: (value) => { clockNow = value; },
        state: () => scheduler.readState(),
        createRuns: () => calls.filter((call) => call[0] === 'createRun').map((call) => call[1].lane),
        cleanup: () => fs.rmSync(stateDir, { recursive: true, force: true }),
    };
}

test('defaults: 07:30, both lanes; times and lanes are parsed and validated', () => {
    assert.deepEqual(parseTimes(undefined), ['07:30']);
    assert.deepEqual(parseTimes('13:00, 8:30,25:00,abc,08:30'), ['08:30', '13:00']);
    assert.deepEqual(parseLanes(undefined), ['HUE', 'TCT']);
    assert.deepEqual(parseLanes('tct, xyz'), ['TCT']);
    assert.deepEqual(parseLanes('xyz'), ['HUE', 'TCT'], 'nothing valid falls back to both');
});

test('off unless enabled; the slot starts one cycle a day, only inside the catch-up window', async () => {
    const off = build({ env: { AUTO_IMPORT_SCHEDULE_ENABLED: 'false' } });
    assert.equal(await off.scheduler.tick(), null);
    off.cleanup();

    const t = build({ now: at('07:29') });
    try {
        assert.equal(await t.scheduler.tick(), null, 'before 07:30 nothing runs');
        assert.equal(t.createRuns().length, 0);
        t.setNow(at('10:31'));
        assert.equal(await t.scheduler.tick(), null, 'more than 3 hours late is skipped');
        assert.equal(t.createRuns().length, 0);
    } finally { t.cleanup(); }
});

test('all lanes succeed on the first attempt: one run per lane, the cycle is done, no retry', async () => {
    const t = build();
    try {
        await t.scheduler.tick(); // attempt 1
        assert.deepEqual(t.createRuns(), ['HUE', 'TCT']);
        assert.deepEqual(t.calls.find((call) => call[0] === 'createRun')[1], { lane: 'HUE', actor: 'scheduler', roles: ['admin'] });
        await t.scheduler.tick(); // runs are COMPLETED: evaluate
        assert.equal(t.state().cycle.done, true);

        t.setNow(at('09:00'));
        await t.scheduler.tick();
        t.setNow(at('12:00'));
        await t.scheduler.tick();
        assert.equal(t.createRuns().length, 2, 'done for the day: nothing more');
    } finally { t.cleanup(); }
});

test('a failure is retried one hour after the attempt began, until every lane succeeds', async () => {
    // HUE ok. TCT: no session at 07:30, a failed run at 08:30, success at 09:30.
    const t = build({
        sessions: { TCT: ['AUTHENTICATION_REQUIRED', 'SESSION_VALID', 'SESSION_VALID'] },
        runStatuses: { 'run-TCT-3': 'COMPLETED_WITH_ERRORS' },
    });
    try {
        await t.scheduler.tick(); // 07:30 attempt 1: HUE run, TCT needs login
        assert.deepEqual(t.createRuns(), ['HUE']);
        await t.scheduler.tick(); // evaluate attempt 1
        let cycle = t.state().cycle;
        assert.equal(cycle.done, false);
        assert.equal(cycle.nextAttemptAt, at('08:30').getTime(), 'next attempt 1 hour after the attempt began');

        t.setNow(at('08:00'));
        await t.scheduler.tick();
        assert.equal(t.createRuns().length, 1, 'not before the hour');

        t.setNow(at('08:30'));
        await t.scheduler.tick(); // attempt 2: both lanes get a run (run-HUE-2, run-TCT-3)
        assert.deepEqual(t.createRuns(), ['HUE', 'HUE', 'TCT']);
        await t.scheduler.tick(); // TCT run ended with errors -> retry
        cycle = t.state().cycle;
        assert.equal(cycle.done, false);
        assert.equal(cycle.nextAttemptAt, at('09:30').getTime());

        t.setNow(at('09:30'));
        await t.scheduler.tick(); // attempt 3
        await t.scheduler.tick();
        assert.equal(t.state().cycle.done, true, 'everything succeeded: stop retrying');
        assert.equal(t.state().cycle.attempts, 3);
    } finally { t.cleanup(); }
});

test('runs still working are waited for; after an hour they count as not finished and a retry follows', async () => {
    const t = build({ runStatuses: { 'run-HUE-1': ['RUNNING', 'RUNNING', 'RUNNING'], 'run-TCT-2': 'COMPLETED' } });
    try {
        await t.scheduler.tick(); // attempt 1
        t.setNow(at('07:50'));
        assert.equal(await t.scheduler.tick(), null, 'still running: no verdict yet');
        assert.equal(t.state().cycle.done, false);
        assert.ok(t.state().cycle.attempt, 'the attempt is still open');

        t.setNow(at('08:31'));
        const verdict = await t.scheduler.tick();
        assert.equal(verdict.done, false);
        assert.equal(verdict.results.HUE, undefined, 'unfinished lane is not reported as ok');
        assert.equal(t.state().cycle.attempt, null);
    } finally { t.cleanup(); }
});

test('nothing to import counts as success; a lane left out of AUTO_IMPORT_SCHEDULE_LANES is never touched', async () => {
    const none = build({ env: { AUTO_IMPORT_SCHEDULE_LANES: 'HUE' }, createRun: async () => { throw Object.assign(new Error('x'), { code: 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE' }); } });
    try {
        await none.scheduler.tick();
        await none.scheduler.tick();
        assert.equal(none.state().cycle.done, true);
        assert.ok(!none.calls.some((call) => call[1] === 'TCT'), 'TCT is never checked or imported');
    } finally { none.cleanup(); }
});

test('a restart neither repeats the slot nor forgets a pending retry; yesterday\'s cycle is ignored', async () => {
    const first = build({ sessions: { TCT: 'AUTHENTICATION_REQUIRED' } });
    try {
        await first.scheduler.tick();
        await first.scheduler.tick();
        const second = new AutoImportScheduler({
            queueService: first.scheduler.queueService,
            sessionService: first.scheduler.sessionService,
            env: { AUTO_IMPORT_SCHEDULE_ENABLED: 'true' },
            clock: () => at('07:45'),
            stateDir: first.stateDir,
            logger: silent,
        });
        assert.equal(second.dueSlot(at('07:45')), null, 'the slot is already on record');
        assert.equal(second.readState().cycle.nextAttemptAt, at('08:30').getTime(), 'the pending retry survives');
        assert.equal(await second.tick(), null, 'not due yet');

        const nextDay = at('07:35', '2026-10-22');
        assert.deepEqual(second.dueSlot(nextDay), { day: '2026-10-22', time: '07:30' }, 'the next day starts a new cycle');
    } finally { first.cleanup(); }
});

test('it gives up after the maximum number of attempts', async () => {
    const t = build({ env: { AUTO_IMPORT_SCHEDULE_MAX_ATTEMPTS: '2' }, sessions: { HUE: 'AUTHENTICATION_REQUIRED' } });
    try {
        await t.scheduler.tick(); await t.scheduler.tick(); // attempt 1
        t.setNow(at('08:30'));
        await t.scheduler.tick(); await t.scheduler.tick(); // attempt 2
        t.setNow(at('09:30'));
        await t.scheduler.tick();
        const cycle = t.state().cycle;
        assert.equal(cycle.done, true);
        assert.match(cycle.lastSummary, /gave up after 2 attempts/);
    } finally { t.cleanup(); }
});

test('keep-alive: checks only sources with a live session and logs every change with how long the session was valid', async () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepalive-'));
    try {
        let now = Date.parse('2026-10-21T00:00:00Z');
        const live = { HUE: true, TCT: false };
        const statuses = ['SESSION_VALID', 'SESSION_VALID', 'AUTHENTICATION_REQUIRED'];
        const preflightCalls = [];
        const sessionService = {
            getInteractiveClient: (source) => (live[source] ? {} : null),
            async preflight(source) { preflightCalls.push(source); return { status: statuses.shift() }; },
        };
        const keepAlive = new DkclSessionKeepAlive({ sessionService, logDir, clock: () => now, logger: silent });

        const first = await keepAlive.tick();
        assert.deepEqual(preflightCalls, ['HUE'], 'TCT has no live session: not touched');
        assert.equal(first.length, 2, 'first sighting of both sources is logged');

        now += 10 * 60000;
        assert.deepEqual(await keepAlive.tick(), [], 'no change: nothing logged');

        now += 3 * 3600000 + 20 * 60000;
        const ended = await keepAlive.tick();
        assert.equal(ended.length, 1);
        assert.match(ended[0], /HUE SESSION_VALID -> AUTHENTICATION_REQUIRED \(was valid for 3h30m\)/);
        const log = fs.readFileSync(path.join(logDir, 'session-watch.log'), 'utf8');
        assert.match(log, /was valid for 3h30m/);
        assert.ok(!/password|cookie|token/i.test(log));

        assert.equal(new DkclSessionKeepAlive({ sessionService, env: { DKCL_KEEPALIVE_ENABLED: 'false' } }).isEnabled(), false);
        assert.equal(new DkclSessionKeepAlive({ sessionService, env: {} }).isEnabled(), true, 'on by default');
    } finally { fs.rmSync(logDir, { recursive: true, force: true }); }
});

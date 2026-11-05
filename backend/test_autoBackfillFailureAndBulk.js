'use strict';

// AUTO-IMPORT-LOG-01: (1) a locked database is retried, (3) "portal data not ready" is recognised and its message
// is returned by the job log, (2) a list of cells becomes one run with many jobs.
// Run per file: node --test --experimental-sqlite test_autoBackfillFailureAndBulk.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyImportBulkReimportAll01Schema } = require('./migrate_import_bulk_reimport_all_01_schema');
const { DEFAULT_PERMISSIONS, DEFAULT_RETRY_POLICY, createFilenameDateRule } = require('./src/services/importIndicatorRegistry');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');
const { AutoBackfillSafetyCoordinator, MIN_LOCK_RETRY_DELAY_MS } = require('./src/services/autoBackfillSafetyCoordinator');

const CIRCUIT_SCOPE = Object.freeze({ dimensions: ['adapter', 'source', 'resource'], threshold: 5, sameSignatureConsecutive: true, integrityFailureStopsImmediately: true });
const asError = (message, code) => Object.assign(new Error(message), code ? { code } : {});

// ------------------------------------------------------------------ classification (pure)
const lane = { retryPolicy: DEFAULT_RETRY_POLICY, portalAdapter: { resourceIdentity: 'R' } };
const job = { executor_id: 'E', source_lane: 'HUE', resource_identity: 'R' };
const classify = (error, laneOverride = lane) => new AutoBackfillSafetyCoordinator().classify(error, { lane: laneOverride, job });

test('(1) a locked database is a transient failure: retried, never faster than the minimum, and it never trips the circuit', () => {
    for (const error of [asError('SQLITE_BUSY: database is locked', 'SQLITE_BUSY'), asError('database is locked'), asError('x', 'SQLITE_LOCKED')]) {
        const failure = classify(error);
        assert.equal(failure.classification, 'TRANSIENT');
        assert.equal(failure.retryable, true);
        assert.equal(failure.systemic, false, 'local contention is not an adapter fault: it does not count toward the circuit');
        assert.equal(failure.minRetryDelayMs, MIN_LOCK_RETRY_DELAY_MS);
        assert.equal(failure.lockContention, true);
    }
    // an unrelated system error is unchanged
    const other = classify(asError('boom', 'SOMETHING_ELSE'));
    assert.deepEqual([other.classification, other.retryable, other.systemic, other.minRetryDelayMs], ['SYSTEM', false, true, 0]);
    // a lane that declares its own class for the code keeps it
    const declared = classify(asError('SQLITE_BUSY', 'SQLITE_BUSY'), { ...lane, errorMap: { SQLITE_BUSY: 'SYSTEM' } });
    assert.equal(declared.classification, 'SYSTEM');
});

test('(3) portal data that is not complete yet is class DATA: isolated to the day, not counted toward the circuit, with a readable code', () => {
    const cases = [
        [asError('Invalid F1.2 TCT Excel data. Missing accepting province code(s): 10, 16, 18.'), 'DATA_NOT_READY'],
        [asError('Invalid F1.2 TCT Excel data. Row 5 has no accepting province code.'), 'DATA_NOT_READY'],
        [asError('portal summary differs', 'F12_TCT_RECONCILIATION_FAILED'), 'F12_TCT_RECONCILIATION_FAILED'],
        [asError('summary invalid', 'F41_HUE_OUTER_SUMMARY_INVALID'), 'F41_HUE_OUTER_SUMMARY_INVALID'],
    ];
    for (const [error, code] of cases) {
        const failure = classify(error);
        assert.equal(failure.classification, 'DATA');
        assert.equal(failure.code, code, 'a specific code is kept, a generic one becomes DATA_NOT_READY');
        assert.equal(failure.dataNotReady, true);
        assert.equal(failure.systemic, false);
        assert.equal(failure.retryable, false);
    }
    // malformed source file is NOT "not ready": it stays a system failure for a person to look at
    const malformed = classify(asError('Invalid F4.2 HUE CSV. Line 4865 has 33 fields instead of 32.'));
    assert.equal(malformed.classification, 'SYSTEM');
    assert.equal(malformed.dataNotReady, false);
});

// ------------------------------------------------------------------ queue fixtures
function indicator(code, priority, statuses, executeBehaviour) {
    const rule = createFilenameDateRule({ id: `${code}_DATE`, prefix: code, parse: () => '2026-01-05' });
    const adapterId = `TEST_${code.replace(/[^A-Z0-9]/gi, '_')}_HUE`;
    return {
        code, key: code, name: `${code} Failure Test`, status: 'ACTIVE', priority, refreshWindowDays: 3,
        trackingStartDate: '2026-01-05', businessTimezone: 'Asia/Ho_Chi_Minh', folder: code, filenamePattern: /\.xlsx$/i,
        filenameDateRule: rule, extractDate: rule.parse, formatFilename: rule.format,
        processedDir: path.join(os.tmpdir(), 'unused-failure-bulk', code),
        lanes: {
            HUE: {
                code: 'HUE', priority: 10, parser: () => ({ parsedData: [] }), targetTable: `fact_${code.replace(/[^A-Z0-9]/gi, '_').toLowerCase()}_hue`,
                completionPolicy: {
                    id: `${adapterId}_COMPLETION`,
                    async evaluate({ indicator: ind, lane: laneConfig, businessDate }) {
                        const value = statuses.get(`${ind.code}|${laneConfig.code}|${businessDate}`) || 'MISSING';
                        return { status: value, reason: value === 'SUCCESS' ? 'COMPLETE_EVIDENCE' : 'NO_IMPORT_EVIDENCE', evidence: { row_count: value === 'SUCCESS' ? 100 : 0 } };
                    },
                },
                automationMode: 'AUTOMATED', manualOnlyReason: null,
                portalAdapter: { id: adapterId, verified: true, reportIdentity: `REPORT_${code}`, resourceIdentity: `RESOURCE_${code}` },
                permissions: { ...DEFAULT_PERMISSIONS, coverageReadRoles: ['admin'] }, retryPolicy: DEFAULT_RETRY_POLICY, circuitScope: CIRCUIT_SCOPE,
            },
        },
        _behaviour: executeBehaviour,
    };
}

async function fixture({ behaviour = async () => {} } = {}) {
    const dbPath = path.join(os.tmpdir(), `fail-bulk-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyAutoBackfillQueueSchema(dbPath);
    await applyAutoBackfillSafetySchema(dbPath);
    await applyImportBulkReimportAll01Schema(dbPath);
    const statuses = new Map();
    const registry = [indicator('F9.A', 10, statuses), indicator('F9.B', 20, statuses)];
    const executors = new AutoBackfillExecutorRegistry({ allowTestExecutors: true });
    const calls = [];
    for (const entry of registry) {
        executors.register(entry.lanes.HUE.portalAdapter.id, {
            async execute(identity) {
                calls.push(identity);
                await behaviour(identity, calls);
                statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
            },
        }, { verified: true, testOnly: true });
    }
    let now = new Date('2026-01-08T01:00:00.000Z'); // newest day 7 Jan
    const store = new AutoBackfillQueueStore({ dbPath, clock: () => now, leaseMs: 1000 });
    const service = new AutoBackfillQueueService({
        store,
        coverageService: new AutoBackfillCoverageService({ db: {}, clock: () => now, registryProvider: () => registry, registryVersion: 'FB-1' }),
        executorRegistry: executors, registryProvider: () => registry, registryVersion: 'FB-1', completionDb: {}, fsImpl: { existsSync: () => false },
        workerId: 'worker-fb', heartbeatMs: 100000,
    });
    return { dbPath, store, service, statuses, calls, advance: (ms) => { now = new Date(now.getTime() + ms); }, cleanup: () => fs.rmSync(dbPath, { force: true }) };
}

test('(1) a locked database retries the job after the minimum delay instead of failing it for good', async () => {
    let busyLeft = 1;
    const f = await fixture({ behaviour: async () => { if (busyLeft > 0) { busyLeft -= 1; throw asError('SQLITE_BUSY: database is locked', 'SQLITE_BUSY'); } } });
    try {
        const created = await f.service.createRun({ indicator: 'F9.A', lane: 'HUE', fromDate: '2026-01-07', toDate: '2026-01-07', actor: 'x', roles: ['admin'] });
        const first = await f.service.processNext();
        assert.notEqual(first.state, 'FAILED_TERMINAL', 'one lock is not the end of the job');
        let job = (await f.store.getRun(created.run.id)).jobs[0];
        assert.equal(job.state, 'QUEUED', 'back in the queue');
        const waitMs = Date.parse(job.next_attempt_at) - f.store.clock().getTime();
        assert.ok(waitMs >= MIN_LOCK_RETRY_DELAY_MS, `waits at least ${MIN_LOCK_RETRY_DELAY_MS} ms (waited ${waitMs})`);

        assert.equal(await f.service.processNext(), null, 'not before the delay');
        f.advance(MIN_LOCK_RETRY_DELAY_MS + 1000);
        const second = await f.service.processNext();
        assert.equal(second.state, 'SUCCESS');
        job = (await f.store.getRun(created.run.id)).jobs[0];
        assert.equal(job.state, 'SUCCESS');
        const jobs = await f.store.listJobs({});
        assert.equal(jobs.items[0].attempt_count, 2);
    } finally { f.cleanup(); }
});

test('(1) a lock that never clears still ends after the attempt budget, and never opens the circuit', async () => {
    const f = await fixture({ behaviour: async () => { throw asError('SQLITE_BUSY: database is locked', 'SQLITE_BUSY'); } });
    try {
        const created = await f.service.createRun({ indicator: 'F9.A', lane: 'HUE', fromDate: '2026-01-07', toDate: '2026-01-07', actor: 'x', roles: ['admin'] });
        for (let i = 0; i < 6; i += 1) {
            f.advance(MIN_LOCK_RETRY_DELAY_MS + 1000);
            await f.service.processNext();
        }
        const { jobs, circuits } = await f.store.getRun(created.run.id);
        assert.equal(jobs[0].state, 'FAILED_TERMINAL');
        const log = await f.store.listJobs({ states: ['FAILED_TERMINAL'] });
        assert.equal(log.items[0].attempt_count, 3, 'the bounded three-attempt budget');
        assert.ok(!circuits.some((circuit) => circuit.state === 'OPEN'), 'local lock contention never stops the lane');
    } finally { f.cleanup(); }
});

test('(3) a day whose portal data is not complete fails as DATA_NOT_READY and the job log returns the readable message', async () => {
    const f = await fixture({ behaviour: async () => { throw asError('Invalid F1.2 TCT Excel data. Missing accepting province code(s): 20, 39, 52.'); } });
    try {
        const created = await f.service.createRun({ indicator: 'F9.A', lane: 'HUE', fromDate: '2026-01-07', toDate: '2026-01-07', actor: 'x', roles: ['admin'] });
        await f.service.processNext();
        const log = await f.service.listJobs({ states: ['FAILED_TERMINAL'] }, { roles: ['admin'] });
        assert.equal(log.total, 1);
        const row = log.items[0];
        assert.equal(row.last_error_class, 'DATA');
        assert.match(row.last_error_signature, /^DATA_NOT_READY:/);
        assert.equal(row.last_result_code, 'DATA_NOT_READY');
        assert.match(row.last_error_message, /Missing accepting province code\(s\): 20, 39, 52/);
        assert.match(row.action_required, /not complete yet/);
        assert.equal(created.run.id, row.run_id);
        // a data problem of one day never stops the lane: the next cell of the same lane still runs
        const next = await f.service.createRun({ indicator: 'F9.A', lane: 'HUE', fromDate: '2026-01-06', toDate: '2026-01-06', actor: 'x', roles: ['admin'] });
        assert.ok(next.jobs.length === 1);
    } finally { f.cleanup(); }
});

// ------------------------------------------------------------------ bulk list API
test('(2) a list of cells becomes ONE run with many jobs: new for missing days, re-import for completed ones, skips reported', async () => {
    const f = await fixture();
    try {
        f.statuses.set('F9.A|HUE|2026-01-06', 'SUCCESS'); // completed day
        const items = [
            { indicator: 'F9.A', lane: 'HUE', business_date: '2026-01-07' }, // missing -> NEW
            { indicator: 'F9.B', lane: 'HUE', business_date: '2026-01-07' }, // missing -> NEW
            { indicator: 'F9.A', lane: 'HUE', business_date: '2026-01-06' }, // completed -> REIMPORT
            { indicator: 'F9.A', source_lane: 'HUE', business_date: '2026-01-07' }, // duplicate of the first (source_lane alias)
            { indicator: 'F9.A', lane: 'HUE', business_date: '2030-01-01' }, // not in coverage
            { indicator: 'F9.Z', lane: 'HUE', business_date: '2026-01-07' }, // unknown indicator
        ];
        await assert.rejects(f.service.createRun({ items, actor: 'binh', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_BULK_CONFIRM_REQUIRED' && e.statusCode === 409);

        const created = await f.service.createRun({ items, confirmReplaceCompleted: true, actor: 'binh', roles: ['admin'] });
        assert.equal(created.run.requested_by, 'binh');
        assert.equal(created.jobs.length, 3, 'one run, three jobs');
        assert.deepEqual(created.jobs.map((j) => [j.indicator, j.business_date, j.import_mode, Number(j.force_reimport)]).sort(), [
            ['F9.A', '2026-01-06', 'REIMPORT', 1],
            ['F9.A', '2026-01-07', 'NEW', 0],
            ['F9.B', '2026-01-07', 'NEW', 0],
        ]);
        assert.deepEqual([created.bulk.requested, created.bulk.job_count, created.bulk.new_count, created.bulk.replace_count], [5, 3, 2, 1]);
        assert.deepEqual(created.bulk.skipped.map((s) => s.reason).sort(), ['NOT_IN_COVERAGE', 'NOT_IN_COVERAGE'], 'unknown cells are reported, not queued');
        const runs = await f.store.countRuns({ statuses: ['RUNNING'] });
        assert.equal(runs, 1);

        while (await f.service.processNext()) { /* drain */ }
        const log = await f.service.listJobs({ runId: created.run.id }, { roles: ['admin'] });
        assert.equal(log.stateCounts.SUCCESS, 3);
    } finally { f.cleanup(); }
});

test('(2) the list request is validated: admin only, no mixing with other scope fields, bounds, and an all-skipped list is refused', async () => {
    const f = await fixture();
    try {
        const one = [{ indicator: 'F9.A', lane: 'HUE', business_date: '2026-01-07' }];
        await assert.rejects(f.service.createRun({ items: one, actor: 'x', roles: ['viewer'] }), (e) => e.code === 'AUTO_BACKFILL_ADMIN_REQUIRED');
        await assert.rejects(f.service.createRun({ items: one, indicator: 'F9.A', actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_ITEMS_EXCLUSIVE');
        await assert.rejects(f.service.createRun({ items: [], actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_ITEMS_REQUIRED');
        await assert.rejects(f.service.createRun({ items: [{ indicator: 'F9.A' }], actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_ITEM_INVALID');
        await assert.rejects(f.service.createRun({ items: [{ indicator: 'F9.A', lane: 'HUE', business_date: '07/01/2026' }], actor: 'x', roles: ['admin'] }), (e) => e.statusCode === 400);
        await assert.rejects(
            f.service.createRun({ items: Array.from({ length: 1001 }, (_, i) => ({ indicator: 'F9.A', lane: 'HUE', business_date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` })), actor: 'x', roles: ['admin'] }),
            (e) => e.code === 'AUTO_BACKFILL_ITEMS_TOO_MANY',
        );
        await assert.rejects(f.service.createRun({ items: [{ indicator: 'F9.A', lane: 'HUE', business_date: '2030-01-01' }], actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE');

        // the same list again while its run is open creates nothing new
        const first = await f.service.createRun({ items: one, actor: 'x', roles: ['admin'] });
        const again = await f.service.createRun({ items: one, actor: 'x', roles: ['admin'] });
        assert.equal(again.creation.created, false);
        assert.equal(again.bulk.job_count, 0);
        assert.equal(first.bulk.job_count, 1);
    } finally { f.cleanup(); }
});

// ------------------------------------------------------------------ 2026-11-04: lost day and stuck run
test('(4) a browser network failure while opening a portal page is transient and retried; a cancelled navigation is not', () => {
    const http2 = classify(asError('page.goto: net::ERR_HTTP2_PROTOCOL_ERROR at https://dkcl.vnpost.vn/x Call log: - navigating'));
    assert.equal(http2.classification, 'TRANSIENT');
    assert.equal(http2.retryable, true);
    assert.equal(classify(asError('page.goto: net::ERR_CONNECTION_RESET at https://x')).classification, 'TRANSIENT');
    // a cancelled navigation is the portal redirecting, not a failure of the network
    assert.equal(classify(asError('page.goto: net::ERR_ABORTED at https://x')).classification, 'SYSTEM');
    // a lane that declares its own class keeps it
    const declared = classify(asError('page.goto: net::ERR_HTTP2_PROTOCOL_ERROR', 'PORTAL_X'), { ...lane, errorMap: { PORTAL_X: 'SYSTEM' } });
    assert.equal(declared.classification, 'SYSTEM');
});

test('(5) a success that closes a circuit also clears CIRCUIT_OPEN on the other jobs and the run of that scope', async () => {
    const { DatabaseSync } = require('node:sqlite');
    const f = await fixture();
    try {
        const created = await f.service.createRun({ indicator: 'F9.A', lane: 'HUE', fromDate: '2026-01-06', toDate: '2026-01-07', actor: 'x', roles: ['admin'] });
        const runId = created.run.id;
        const db = new DatabaseSync(f.dbPath);
        const jobs = db.prepare('SELECT id, business_date, circuit_scope_key k, resource_identity FROM auto_backfill_job WHERE run_id = ? ORDER BY business_date').all(runId);
        assert.equal(jobs.length, 2);
        const scopeKey = jobs[0].k;
        // the state a tripped circuit left behind on the day that was not yet processed, with the circuit already closed
        db.prepare("INSERT INTO auto_backfill_circuit (scope_key, adapter_id, source_lane, resource_identity, error_signature, consecutive_count, state, last_error_code, opened_at, updated_at) VALUES (?, 'A', 'HUE', ?, 'S', 1, 'CLOSED', 'X', '2026-01-08T00:00:00Z', '2026-01-08T00:00:00Z')").run(scopeKey, jobs[0].resource_identity);
        db.prepare("UPDATE auto_backfill_job SET safety_state = 'CIRCUIT_OPEN', action_required = 'reset' WHERE id = ?").run(jobs[0].id);
        db.prepare("UPDATE auto_backfill_run SET safety_state = 'CIRCUIT_OPEN', action_required = 'reset' WHERE id = ?").run(runId);
        // the other day succeeds in a later run on the same scope -> recordCircuitSuccess
        await f.store.recordCircuitSuccess({ run_id: runId, id: jobs[1].id }, { key: scopeKey });
        const after = db.prepare('SELECT business_date, safety_state, action_required FROM auto_backfill_job WHERE run_id = ? ORDER BY business_date').all(runId);
        assert.equal(after[0].safety_state, null, 'the stuck day is released');
        assert.equal(after[0].action_required, null);
        const run = db.prepare('SELECT safety_state, action_required FROM auto_backfill_run WHERE id = ?').get(runId);
        assert.equal(run.safety_state, null, 'and so is the run, so the worker takes the day again');
        db.close();
    } finally { f.cleanup(); }
});

test('(6) Opus review: other momentary failures are transient, waiting for a login does not count toward the circuit', () => {
    for (const msg of ['F1.1 report request returned HTTP 503.', 'apiRequestContext.get: read ECONNRESET', 'socket hang up', 'Target page, context or browser has been closed', 'page.goto: Timeout 60000ms exceeded.']) {
        assert.equal(classify(asError(msg)).classification, 'TRANSIENT', msg);
    }
    assert.equal(classify(asError('F1.1 report request returned HTTP 403.')).classification, 'SYSTEM');
    assert.equal(classify(asError('page.goto: net::ERR_CERT_AUTHORITY_INVALID')).classification, 'SYSTEM');
    assert.equal(classify(asError('broker down', 'HUE_BROKER_UNREACHABLE')).classification, 'TRANSIENT');
    const pending = classify(asError('login in progress', 'SESSION_PENDING_HUMAN_ACTION'));
    assert.equal(pending.systemic, false);
});

test('(7) Opus review C1/N6: an open circuit is not rewritten by another signature; orphan CIRCUIT_OPEN flags are released by resume and reset', async () => {
    const { DatabaseSync } = require('node:sqlite');
    const f = await fixture();
    try {
        const created = await f.service.createRun({ indicator: 'F9.A', lane: 'HUE', fromDate: '2026-01-06', toDate: '2026-01-07', actor: 'x', roles: ['admin'] });
        const runId = created.run.id;
        const db = new DatabaseSync(f.dbPath);
        const job = db.prepare('SELECT id, circuit_scope_key k, resource_identity FROM auto_backfill_job WHERE run_id = ? ORDER BY business_date').get(runId);
        // orphan: flag on job and run, circuit row closed
        db.prepare("INSERT INTO auto_backfill_circuit (scope_key, adapter_id, source_lane, resource_identity, error_signature, consecutive_count, state, last_error_code, updated_at) VALUES (?, 'A', 'HUE', ?, 'S', 1, 'CLOSED', 'X', '2026-01-08T00:00:00Z')").run(job.k, job.resource_identity);
        db.prepare("UPDATE auto_backfill_job SET safety_state = 'CIRCUIT_OPEN' WHERE id = ?").run(job.id);
        db.prepare("UPDATE auto_backfill_run SET safety_state = 'CIRCUIT_OPEN' WHERE id = ?").run(runId);
        // the admin reset used to answer 409 here; now it clears the leftover flag
        await f.store.resetCircuitsForRun(runId, 'admin');
        assert.equal(db.prepare('SELECT safety_state s FROM auto_backfill_job WHERE id = ?').get(job.id).s, null);
        assert.equal(db.prepare('SELECT safety_state s FROM auto_backfill_run WHERE id = ?').get(runId).s, null);
        // resume on a RUNNING run does the same
        db.prepare("UPDATE auto_backfill_job SET safety_state = 'CIRCUIT_OPEN' WHERE id = ?").run(job.id);
        db.prepare("UPDATE auto_backfill_run SET safety_state = 'CIRCUIT_OPEN' WHERE id = ?").run(runId);
        await f.store.resumeRun(runId, 'admin');
        assert.equal(db.prepare('SELECT safety_state s FROM auto_backfill_job WHERE id = ?').get(job.id).s, null);
        db.close();
    } finally { f.cleanup(); }
});

test('(8) Opus review C2: an admin can cancel a run stuck on BLOCKED_INTEGRITY; its days are freed and the block is lifted', async () => {
    const { DatabaseSync } = require('node:sqlite');
    const f = await fixture();
    try {
        const created = await f.service.createRun({ indicator: 'F9.A', lane: 'HUE', fromDate: '2026-01-06', toDate: '2026-01-07', actor: 'x', roles: ['admin'] });
        const runId = created.run.id;
        const db = new DatabaseSync(f.dbPath);
        db.prepare("UPDATE auto_backfill_run SET safety_state = 'BLOCKED_INTEGRITY' WHERE id = ?").run(runId);
        await assert.rejects(f.service.cancelRun(runId, { actor: 'x', roles: ['viewer'] }), (e) => e.code === 'AUTO_BACKFILL_ADMIN_REQUIRED');
        const result = await f.service.cancelRun(runId, { actor: 'x', roles: ['admin'] });
        assert.equal(result.run.status, 'CANCELLED');
        assert.equal(result.run.safety_state, null);
        assert.equal(db.prepare("SELECT COUNT(*) n FROM auto_backfill_job WHERE run_id = ? AND state = 'CANCELLED'").get(runId).n, 2);
        await assert.rejects(f.service.cancelRun(runId, { actor: 'x', roles: ['admin'] }), (e) => e.code === 'AUTO_BACKFILL_RUN_ALREADY_ENDED');
        // the same days can be queued again
        const again = await f.service.createRun({ indicator: 'F9.A', lane: 'HUE', fromDate: '2026-01-06', toDate: '2026-01-07', actor: 'x', roles: ['admin'] });
        assert.notEqual(again.run.id, runId);
        db.close();
    } finally { f.cleanup(); }
});

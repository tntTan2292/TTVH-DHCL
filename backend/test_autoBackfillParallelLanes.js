'use strict';

// AUTO-BACKFILL-PARALLEL-LANES-01: HUE and TCT jobs may run at the same time (one slot per source lane), one job at a
// time in each lane, and the writes to the shared database connection are queued.
// Run per file: node --test --experimental-sqlite test_autoBackfillParallelLanes.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyImportBulkReimportAll01Schema } = require('./migrate_import_bulk_reimport_all_01_schema');
const { DEFAULT_PERMISSIONS, DEFAULT_RETRY_POLICY, createFilenameDateRule } = require('./src/services/importIndicatorRegistry');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');
const { AutoBackfillWorkerCoordinator } = require('./src/services/autoBackfillWorkerCoordinator');
const { buildRuntime, isParallelLanesEnabled, listLaneCodes, LaneCoordinatorGroup } = require('./src/services/autoBackfillQueueRuntime');
const { withImportWriteLock, importWriteLockQueueLength } = require('./src/services/importWriteLock');

const CIRCUIT_SCOPE = Object.freeze({ dimensions: ['adapter', 'source', 'resource'], threshold: 5, sameSignatureConsecutive: true, integrityFailureStopsImmediately: true });

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

async function eventually(predicate, { timeoutMs = 4000, intervalMs = 10 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
        last = await predicate();
        if (last) return last;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    assert.fail(`Condition was not met within ${timeoutMs}ms; last value: ${JSON.stringify(last)}`);
}

function createLane({ indicator, code, priority, statuses }) {
    const adapterId = `TEST_${indicator.replace(/[^A-Z0-9]/gi, '_')}_${code}`;
    return {
        code,
        priority,
        parser: () => ({ parsedData: [] }),
        targetTable: `fact_${indicator.replace(/[^A-Z0-9]/gi, '_').toLowerCase()}_${code.toLowerCase()}`,
        completionPolicy: {
            id: `${adapterId}_COMPLETION`,
            async evaluate({ indicator: registration, lane, businessDate }) {
                const key = `${registration.code}|${lane.code}|${businessDate}`;
                const status = statuses.get(key) || 'MISSING';
                return { status, reason: status === 'SUCCESS' ? 'COMPLETE_EVIDENCE' : 'NO_IMPORT_EVIDENCE', evidence: { key, status } };
            },
        },
        automationMode: 'AUTOMATED',
        manualOnlyReason: null,
        portalAdapter: { id: adapterId, verified: true, reportIdentity: `REPORT_${indicator}_${code}`, resourceIdentity: `RESOURCE_${indicator}_${code}` },
        permissions: { ...DEFAULT_PERMISSIONS, coverageReadRoles: ['admin'] },
        retryPolicy: DEFAULT_RETRY_POLICY,
        circuitScope: CIRCUIT_SCOPE,
    };
}

function createIndicator({ code, priority, startDate, laneCodes, statuses }) {
    const filenameDateRule = createFilenameDateRule({ id: `${code}_DATE`, prefix: code, parse: () => startDate });
    return {
        code,
        key: code,
        name: `${code} Parallel Test`,
        status: 'ACTIVE',
        priority,
        trackingStartDate: startDate,
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: code,
        filenamePattern: /\.xlsx$/i,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir: path.join(os.tmpdir(), 'unused-parallel-lanes-artifacts', code),
        lanes: Object.fromEntries(laneCodes.map((laneCode, index) => [laneCode, createLane({ indicator: code, code: laneCode, priority: (index + 1) * 10, statuses })])),
    };
}

async function createFixture({ execute = null, leaseMs = 1000, heartbeatMs = 100000 } = {}) {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-parallel-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyAutoBackfillQueueSchema(dbPath);
    await applyAutoBackfillSafetySchema(dbPath);
    await applyImportBulkReimportAll01Schema(dbPath);
    const statuses = new Map();
    const clockState = { now: new Date('2026-01-04T01:00:00.000Z') };
    const registry = [
        createIndicator({ code: 'F9.A', priority: 10, startDate: '2026-01-02', laneCodes: ['HUE', 'TCT'], statuses }),
        createIndicator({ code: 'F9.B', priority: 20, startDate: '2026-01-02', laneCodes: ['HUE', 'TCT'], statuses }),
    ];
    const calls = [];
    const executorRegistry = new AutoBackfillExecutorRegistry({ allowTestExecutors: true });
    for (const registration of registry) {
        for (const lane of Object.values(registration.lanes)) {
            executorRegistry.register(lane.portalAdapter.id, {
                async execute(identity) {
                    calls.push(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`);
                    if (execute) await execute(identity);
                    statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
                },
            }, { verified: true, testOnly: true });
        }
    }
    const coverageService = new AutoBackfillCoverageService({ db: {}, clock: () => clockState.now, registryProvider: () => registry, registryVersion: 'PARALLEL-TEST-1' });
    const service = new AutoBackfillQueueService({
        store: new AutoBackfillQueueStore({ dbPath, clock: () => clockState.now, leaseMs }),
        coverageService,
        executorRegistry,
        registryProvider: () => registry,
        registryVersion: 'PARALLEL-TEST-1',
        completionDb: {},
        fsImpl: { existsSync: () => false },
        workerId: 'worker-parallel',
        heartbeatMs,
    });
    return { dbPath, statuses, clockState, service, calls, cleanup() { fs.rmSync(dbPath, { force: true }); } };
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => { const db = new sqlite3.Database(dbPath, (error) => error ? reject(error) : resolve(db)); });
}
const dbExec = (db, sql) => new Promise((resolve, reject) => db.exec(sql, (error) => error ? reject(error) : resolve()));
const dbAll = (db, sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
const dbClose = (db) => new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));

// ---- schema -------------------------------------------------------------------------------------------------------

test('a database made before per-lane leases is upgraded: lease rows kept, one RUNNING job per lane, idempotent', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-legacy-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    try {
        const legacy = await openDb(dbPath);
        await dbExec(legacy, `
            CREATE TABLE auto_backfill_run (id TEXT PRIMARY KEY, request_key TEXT NOT NULL, registry_version TEXT NOT NULL, as_of_business_date TEXT NOT NULL,
                requested_indicator TEXT, requested_lane TEXT, requested_by TEXT NOT NULL, status TEXT NOT NULL, status_reason TEXT,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT, ended_at TEXT);
            CREATE TABLE auto_backfill_job (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, indicator TEXT NOT NULL, source_lane TEXT NOT NULL, business_date TEXT NOT NULL,
                state TEXT NOT NULL, indicator_priority INTEGER NOT NULL, lane_priority INTEGER NOT NULL, completion_policy_id TEXT NOT NULL, executor_id TEXT NOT NULL,
                registry_version TEXT NOT NULL, lease_owner TEXT, lease_token TEXT, lease_acquired_at TEXT, lease_expires_at TEXT, terminal_reason TEXT,
                completion_evidence_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT, ended_at TEXT);
            CREATE UNIQUE INDEX uq_auto_backfill_one_running_job ON auto_backfill_job((1)) WHERE state = 'RUNNING';
            CREATE TABLE auto_backfill_worker_lease (
                lease_name TEXT PRIMARY KEY CHECK (lease_name = 'GLOBAL_DKCL'), job_id TEXT NOT NULL UNIQUE, worker_id TEXT NOT NULL,
                lease_token TEXT NOT NULL UNIQUE, acquired_at TEXT NOT NULL, expires_at TEXT NOT NULL,
                FOREIGN KEY(job_id) REFERENCES auto_backfill_job(id));
            CREATE INDEX idx_auto_backfill_worker_lease_expiry ON auto_backfill_worker_lease(expires_at);
            INSERT INTO auto_backfill_run VALUES ('r1','k','v','2026-01-04',NULL,NULL,'admin','RUNNING',NULL,'t','t',NULL,NULL);
            INSERT INTO auto_backfill_job (id, run_id, indicator, source_lane, business_date, state, indicator_priority, lane_priority, completion_policy_id, executor_id, registry_version, created_at, updated_at)
                VALUES ('j1','r1','F9.A','HUE','2026-01-03','RUNNING',10,10,'p','e','v','t','t');
            INSERT INTO auto_backfill_worker_lease VALUES ('GLOBAL_DKCL','j1','w','tok','t','2099-01-01');
        `);
        await dbClose(legacy);

        await applyAutoBackfillQueueSchema(dbPath);
        await applyAutoBackfillQueueSchema(dbPath); // idempotent

        const db = await openDb(dbPath);
        try {
            assert.deepEqual(await dbAll(db, 'SELECT lease_name, job_id FROM auto_backfill_worker_lease'), [{ lease_name: 'GLOBAL_DKCL', job_id: 'j1' }], 'the existing lease row is kept');
            const indexes = (await dbAll(db, "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'auto_backfill_job'")).map((row) => row.name);
            assert.ok(!indexes.includes('uq_auto_backfill_one_running_job'), 'the system-wide one-RUNNING-job index is gone');
            assert.ok(indexes.includes('uq_auto_backfill_one_running_job_per_lane'));
            const expiry = await dbAll(db, "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_auto_backfill_worker_lease_expiry'");
            assert.equal(expiry.length, 1, 'the lease expiry index is recreated');

            const insertJob = (id, lane, state) => dbExec(db, `INSERT INTO auto_backfill_job (id, run_id, indicator, source_lane, business_date, state, indicator_priority, lane_priority, completion_policy_id, executor_id, registry_version, created_at, updated_at)
                VALUES ('${id}','r1','F9.A','${lane}','2026-01-0${id.length}','${state}',10,10,'p','e','v','t','t')`);
            await insertJob('jtct', 'TCT', 'RUNNING'); // a TCT job may run next to the HUE one
            await assert.rejects(insertJob('jhue2', 'HUE', 'RUNNING'), /UNIQUE/, 'but never two RUNNING jobs of one lane');
            await dbExec(db, "INSERT INTO auto_backfill_worker_lease VALUES ('DKCL_TCT','jtct','w','tok2','t','2099-01-01')");
            await assert.rejects(dbExec(db, "INSERT INTO auto_backfill_worker_lease VALUES ('SOMETHING_ELSE','jx','w','tok3','t','2099-01-01')"), /CHECK|FOREIGN/);
        } finally {
            await dbClose(db);
        }
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

// ---- store: one slot per lane --------------------------------------------------------------------------------------

test('store: a HUE and a TCT job are leased at the same time; a second job of one lane is not', async () => {
    const fixture = await createFixture();
    try {
        await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const store = fixture.service.store;
        const hue = await store.acquireNextJob('w-hue', { lane: 'HUE' });
        const tct = await store.acquireNextJob('w-tct', { lane: 'TCT' });
        assert.equal(hue.source_lane, 'HUE');
        assert.equal(tct.source_lane, 'TCT');
        assert.equal(await store.acquireNextJob('w-hue-2', { lane: 'HUE' }), null, 'the HUE slot is taken');
        assert.equal(await store.acquireNextJob('w-tct-2', { lane: 'TCT' }), null, 'the TCT slot is taken');
        assert.equal(await store.acquireNextJob('w-serial'), null, 'the serial (no lane) path still allows one job in the system');
        assert.equal(await store.countRows('auto_backfill_worker_lease'), 2);

        const state = await store.getCoordinatorState({ lane: 'HUE' });
        assert.equal(state.runningJobCount, 1, 'only the HUE running job is counted for the HUE coordinator');
        assert.ok(state.leaseExpiresAt, 'the HUE lease is the one reported');
        const whole = await store.getCoordinatorState();
        assert.equal(whole.runningJobCount, 2);

        await store.completeLeasedJob(hue.id, hue.lease_token, { state: 'SUCCESS', reasonCode: 'TEST' });
        assert.equal(await store.countRows('auto_backfill_worker_lease'), 1, 'completing a job frees only its own slot');
        const nextHue = await store.acquireNextJob('w-hue-3', { lane: 'HUE' });
        assert.equal(nextHue.source_lane, 'HUE');
        assert.notEqual(nextHue.id, hue.id);
        assert.equal(await store.renewLease(tct.id, tct.lease_token).then(() => 'renewed'), 'renewed', 'a lane lease can be renewed by job and token');
    } finally {
        fixture.cleanup();
    }
});

test('store: without a lane the queue is exactly one slot, as before', async () => {
    const fixture = await createFixture();
    try {
        await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const store = fixture.service.store;
        const first = await store.acquireNextJob('w1');
        assert.ok(first);
        assert.equal(await store.acquireNextJob('w2'), null);
        assert.equal(await store.acquireNextJob('w3', { lane: first.source_lane }), null, 'the lane of the running job is busy');
        const rows = await fixture.service.store.withDb((db) => dbAll(db, 'SELECT lease_name FROM auto_backfill_worker_lease'));
        assert.deepEqual(rows, [{ lease_name: 'GLOBAL_DKCL' }]);
    } finally {
        fixture.cleanup();
    }
});

// ---- service and coordinators --------------------------------------------------------------------------------------

test('service: processNext for HUE and for TCT run at the same time; two calls for one lane do not', async () => {
    const started = { HUE: deferred(), TCT: deferred() };
    const release = deferred();
    const fixture = await createFixture({ execute: async (identity) => {
        started[identity.sourceLane]?.resolve();
        await release.promise;
    } });
    try {
        await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const hueWork = fixture.service.processNext({ lane: 'HUE' });
        const tctWork = fixture.service.processNext({ lane: 'TCT' });
        await Promise.all([started.HUE.promise, started.TCT.promise]); // both executors are inside execute() together
        assert.equal(await fixture.service.processNext({ lane: 'HUE' }), null, 'a lane never runs two jobs at once');
        release.resolve();
        const [hue, tct] = await Promise.all([hueWork, tctWork]);
        assert.equal(hue.state, 'SUCCESS');
        assert.equal(tct.state, 'SUCCESS');
    } finally {
        fixture.cleanup();
    }
});

test('coordinators: one per lane drain the whole run, the lanes overlap, and no lane overlaps itself', async () => {
    const running = { HUE: 0, TCT: 0 };
    let overlap = false;
    let maxPerLane = 0;
    // The first job of each lane waits (bounded) until the other lane's first job is inside execute() too, so the
    // overlap is proven by a rendezvous, not by timing: database transactions of the two lanes can briefly queue on
    // SQLite's lock, which would make a "did they happen to overlap" check flaky with very short jobs.
    const firstStarted = { HUE: deferred(), TCT: deferred() };
    const seen = { HUE: false, TCT: false };
    const fixture = await createFixture({ execute: async (identity) => {
        const lane = identity.sourceLane;
        running[lane] += 1;
        maxPerLane = Math.max(maxPerLane, running[lane]);
        if (!seen[lane]) {
            seen[lane] = true;
            firstStarted[lane].resolve();
            const other = lane === 'HUE' ? 'TCT' : 'HUE';
            const met = await Promise.race([firstStarted[other].promise.then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 3000))]);
            if (met && running.HUE > 0 && running.TCT > 0) overlap = true;
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
        running[lane] -= 1;
    } });
    const coordinators = ['HUE', 'TCT'].map((lane) => new AutoBackfillWorkerCoordinator({
        queueService: fixture.service, lane, minPollMs: 5, maxPollMs: 25, leaseGraceMs: 1, onError(error) { throw error; },
    }));
    const group = new LaneCoordinatorGroup(coordinators);
    fixture.service.setWorkAvailableNotifier(() => group.wake());
    try {
        group.start();
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        await eventually(async () => {
            const run = await fixture.service.store.getRun(created.run.id);
            return run.jobs.every((job) => job.state === 'SUCCESS');
        });
        assert.equal(fixture.calls.length, created.jobs.length);
        assert.equal(overlap, true, 'a HUE job and a TCT job ran at the same time');
        assert.equal(maxPerLane, 1, 'never two jobs of one lane at once');
        assert.deepEqual(new Set(coordinators.map((item) => item.snapshot().lane)), new Set(['HUE', 'TCT']));
    } finally {
        await group.stop();
        fixture.cleanup();
    }
});

test('a lane waiting for a login does not stop the other lane', async () => {
    const fixture = await createFixture({ execute: async (identity) => {
        if (identity.sourceLane === 'TCT') {
            const error = new Error('Product Owner must sign in');
            error.code = 'AUTHENTICATION_REQUIRED';
            error.autoBackfill = { classification: 'AUTHENTICATION' };
            throw error;
        }
    } });
    const coordinators = ['HUE', 'TCT'].map((lane) => new AutoBackfillWorkerCoordinator({
        queueService: fixture.service, lane, minPollMs: 5, maxPollMs: 25, leaseGraceMs: 1, onError() { /* the TCT login wait is expected */ },
    }));
    const group = new LaneCoordinatorGroup(coordinators);
    fixture.service.setWorkAvailableNotifier(() => group.wake());
    try {
        group.start();
        // one run per lane, as the schedule and the screen create them: a run that waits for a login holds its own lane only
        const hueRun = await fixture.service.createRun({ lane: 'HUE', actor: 'admin', roles: ['admin'] });
        const tctRun = await fixture.service.createRun({ lane: 'TCT', actor: 'admin', roles: ['admin'] });
        await eventually(async () => {
            const run = await fixture.service.store.getRun(hueRun.run.id);
            return run.jobs.every((job) => job.state === 'SUCCESS');
        });
        const after = await fixture.service.store.getRun(tctRun.run.id);
        assert.ok(after.jobs.every((job) => job.state !== 'SUCCESS'), 'the TCT jobs are still waiting for the login');
    } finally {
        await group.stop();
        fixture.cleanup();
    }
});

// ---- runtime switch ------------------------------------------------------------------------------------------------

test('runtime: the flag is off by default; on, one coordinator is made per lane', async () => {
    assert.equal(isParallelLanesEnabled({}), false);
    assert.equal(isParallelLanesEnabled({ AUTO_BACKFILL_PARALLEL_LANES: 'false' }), false);
    assert.equal(isParallelLanesEnabled({ AUTO_BACKFILL_PARALLEL_LANES: ' TRUE ' }), true);
    assert.deepEqual(listLaneCodes(), ['HUE', 'TCT']);

    const dbPath = path.join(os.tmpdir(), `auto-backfill-runtime-${Date.now()}.sqlite`);
    const made = [];
    const factory = (options) => { made.push(options); return { wake() { return true; }, start() {}, async stop() {}, lane: options.lane || null }; };
    try {
        const serial = buildRuntime({ runtimeDbPath: dbPath, completionDb: {}, registerExecutors() {}, coordinatorFactory: factory, parallelLanes: false });
        assert.equal(made.length, 1);
        assert.equal(made[0].lane, undefined, 'serial: one coordinator without a lane');
        assert.ok(!(serial.coordinator instanceof LaneCoordinatorGroup));

        made.length = 0;
        const parallel = buildRuntime({ runtimeDbPath: dbPath, completionDb: {}, registerExecutors() {}, coordinatorFactory: factory, parallelLanes: true, lanes: ['HUE', 'TCT'] });
        assert.deepEqual(made.map((options) => options.lane), ['HUE', 'TCT']);
        assert.ok(parallel.coordinator instanceof LaneCoordinatorGroup);
        assert.equal(parallel.coordinator.wake(), true);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

// ---- the shared database connection ---------------------------------------------------------------------------------

test('import write lock: one at a time, first in first out, a failure does not block the next', async () => {
    const order = [];
    let active = 0;
    let maxActive = 0;
    const task = (name, ms, fail = false) => withImportWriteLock(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        order.push(`start ${name}`);
        await new Promise((resolve) => setTimeout(resolve, ms));
        order.push(`end ${name}`);
        active -= 1;
        if (fail) throw new Error(`${name} failed`);
        return name;
    });
    const results = await Promise.allSettled([task('HUE', 30), task('TCT', 5, true), task('HUE2', 5)]);
    assert.equal(maxActive, 1, 'never two at once');
    assert.deepEqual(order, ['start HUE', 'end HUE', 'start TCT', 'end TCT', 'start HUE2', 'end HUE2']);
    assert.deepEqual(results.map((item) => item.status), ['fulfilled', 'rejected', 'fulfilled']);
    assert.equal(results[2].value, 'HUE2');
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(importWriteLockQueueLength(), 0);
});

test('without the lock two imports on the shared connection corrupt each other; with it they do not', async () => {
    const database = new sqlite3.Database(':memory:');
    const run = (sql, params = []) => new Promise((resolve, reject) => database.run(sql, params, (error) => error ? reject(error) : resolve()));
    const all = (sql) => new Promise((resolve, reject) => database.all(sql, (error, rows) => error ? reject(error) : resolve(rows)));
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const importDay = async (name, fail) => {
        try {
            await run('BEGIN TRANSACTION');
            await run('INSERT INTO fact VALUES (?)', [name]);
            await sleep(15);
            await run('INSERT INTO fact VALUES (?)', [name]);
            if (fail) throw new Error('boom');
            await run('COMMIT');
            return 'committed';
        } catch (error) {
            try { await run('ROLLBACK'); } catch (_) { /* nothing to roll back */ }
            return error.message;
        }
    };
    try {
        await run('CREATE TABLE fact (v TEXT)');
        const unlocked = await Promise.all([importDay('HUE', true), importDay('TCT', false)]);
        assert.match(unlocked[1], /cannot start a transaction within a transaction/, 'the second import fails at BEGIN');

        await run('DELETE FROM fact');
        const locked = await Promise.all([
            withImportWriteLock(() => importDay('HUE', true)),
            withImportWriteLock(() => importDay('TCT', false)),
        ]);
        assert.deepEqual(locked, ['boom', 'committed']);
        assert.deepEqual(await all('SELECT v, COUNT(*) AS n FROM fact GROUP BY v'), [{ v: 'TCT', n: 2 }], 'HUE rolled back completely, TCT committed completely');
    } finally {
        database.close();
    }
});

// ---- review fixes (Opus review of AUTO-BACKFILL-PARALLEL-LANES-01) -------------------------------------------------

test('recovery is lane scoped: one lane never recovers the other lane\'s job whose lease looks expired', async () => {
    const fixture = await createFixture({ leaseMs: 1000 });
    try {
        await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const store = fixture.service.store;
        const hue = await store.acquireNextJob('w-hue', { lane: 'HUE' });
        const tct = await store.acquireNextJob('w-tct', { lane: 'TCT' });
        fixture.clockState.now = new Date(fixture.clockState.now.getTime() + 60000); // both leases are now expired

        assert.deepEqual(await fixture.service.recoverInterruptedWork({ lane: 'TCT' }).then((items) => items.map((item) => item.jobId)), [tct.id], 'TCT recovers only its own job');
        const during = await store.getRun(hue.run_id);
        assert.equal(during.jobs.find((job) => job.id === hue.id).state, 'RUNNING', 'the HUE job is left to its own lane');

        assert.deepEqual(await fixture.service.recoverInterruptedWork({ lane: 'HUE' }).then((items) => items.map((item) => item.jobId)), [hue.id]);
    } finally {
        fixture.cleanup();
    }
});

test('the heartbeat survives one failed renewal (busy database) and stops only when the lease is lost', async () => {
    const release = deferred();
    const fixture = await createFixture({ heartbeatMs: 10, execute: async () => { await release.promise; } });
    try {
        await fixture.service.createRun({ lane: 'HUE', actor: 'admin', roles: ['admin'] });
        const store = fixture.service.store;
        const realRenew = store.renewLease.bind(store);
        let calls = 0;
        store.renewLease = async (jobId, token) => {
            calls += 1;
            if (calls === 1) throw Object.assign(new Error('SQLITE_BUSY'), { code: 'SQLITE_BUSY' });
            return realRenew(jobId, token);
        };
        const work = fixture.service.processNext({ lane: 'HUE' });
        await eventually(() => calls >= 3, { timeoutMs: 2000 });
        const seen = calls;
        assert.ok(seen >= 3, 'renewals continued after the first one failed');
        store.renewLease = async () => { calls += 1; throw Object.assign(new Error('lost'), { code: 'AUTO_BACKFILL_LEASE_LOST' }); };
        await new Promise((resolve) => setTimeout(resolve, 60));
        const afterLost = calls;
        await new Promise((resolve) => setTimeout(resolve, 60));
        assert.equal(calls, afterLost, 'no more renewals once the lease is lost');
        release.resolve();
        await work.catch(() => {}); // the lost lease may fail the completion; the heartbeat behaviour is what is under test
    } finally {
        fixture.cleanup();
    }
});

test('pausing a run with a HUE and a TCT job running: PAUSED only when both have finished', async () => {
    const started = { HUE: deferred(), TCT: deferred() };
    const release = { HUE: deferred(), TCT: deferred() };
    const fixture = await createFixture({ execute: async (identity) => {
        started[identity.sourceLane].resolve();
        await release[identity.sourceLane].promise;
    } });
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const hueWork = fixture.service.processNext({ lane: 'HUE' });
        const tctWork = fixture.service.processNext({ lane: 'TCT' });
        await Promise.all([started.HUE.promise, started.TCT.promise]);

        await fixture.service.pauseRun(created.run.id, { actor: 'admin', roles: ['admin'] });
        assert.equal((await fixture.service.store.getRun(created.run.id)).run.status, 'PAUSING');

        release.HUE.resolve();
        await hueWork;
        assert.equal((await fixture.service.store.getRun(created.run.id)).run.status, 'PAUSING', 'the TCT job is still running');

        release.TCT.resolve();
        await tctWork;
        assert.equal((await fixture.service.store.getRun(created.run.id)).run.status, 'PAUSED');
    } finally {
        fixture.cleanup();
    }
});

test('a lane coordinator treats an error that names no lane as its own lane\'s', async () => {
    const queueService = {
        async processNext() { throw Object.assign(new Error('sign in'), { code: 'AUTHENTICATION_REQUIRED' }); },
        store: { async getCoordinatorState() { return { openLaneEligibleJobCount: 0 }; } },
    };
    const coordinator = new AutoBackfillWorkerCoordinator({ queueService, lane: 'TCT', onError() {} });
    coordinator.start();
    await eventually(() => coordinator.authenticationBlockedLanes.size > 0);
    assert.deepEqual([...coordinator.authenticationBlockedLanes], ['TCT']);
    assert.equal(coordinator.isDrainHalted(), false, 'it does not halt itself as an unknown lane');
    await coordinator.stop();
});

test('the TCT F1.3 backfill import is inside the shared-connection write lock', () => {
    const source = fs.readFileSync(path.join(__dirname, 'src/services/tctF13BackfillService.js'), 'utf8');
    assert.match(source, /withImportWriteLock\(\(\) => this\.importNationalParsedData\(/);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const {
    DEFAULT_PERMISSIONS,
    DEFAULT_RETRY_POLICY,
    createFilenameDateRule,
} = require('./src/services/importIndicatorRegistry');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');
const { AutoBackfillWorkerCoordinator } = require('./src/services/autoBackfillWorkerCoordinator');

const CIRCUIT_SCOPE = Object.freeze({
    dimensions: ['adapter', 'source', 'resource'],
    threshold: 5,
    sameSignatureConsecutive: true,
    integrityFailureStopsImmediately: true,
});

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

async function eventually(predicate, { timeoutMs = 2000, intervalMs = 10 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let lastValue;
    while (Date.now() < deadline) {
        lastValue = await predicate();
        if (lastValue) return lastValue;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    assert.fail(`Condition was not met within ${timeoutMs}ms; last value: ${JSON.stringify(lastValue)}`);
}

function attachCoordinator(service, clockState, options = {}) {
    const coordinator = new AutoBackfillWorkerCoordinator({
        queueService: service,
        clock: () => clockState.now,
        minPollMs: 5,
        maxPollMs: 25,
        leaseGraceMs: 1,
        onError(error) { throw error; },
        ...options,
    });
    service.setWorkAvailableNotifier(() => coordinator.wake());
    return coordinator;
}

function createLane({ indicator, code, priority, statuses, readRoles = ['admin'] }) {
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
        portalAdapter: {
            id: adapterId,
            verified: true,
            reportIdentity: `REPORT_${indicator}_${code}`,
            resourceIdentity: `RESOURCE_${indicator}_${code}`,
        },
        permissions: { ...DEFAULT_PERMISSIONS, coverageReadRoles: readRoles },
        retryPolicy: DEFAULT_RETRY_POLICY,
        circuitScope: CIRCUIT_SCOPE,
    };
}

function createIndicator({ code, priority, startDate, laneCodes, statuses, readRoles }) {
    const filenameDateRule = createFilenameDateRule({ id: `${code}_DATE`, prefix: code, parse: () => startDate });
    const lanes = Object.fromEntries(laneCodes.map((laneCode, index) => [
        laneCode,
        createLane({ indicator: code, code: laneCode, priority: (index + 1) * 10, statuses, readRoles }),
    ]));
    return {
        code,
        key: code,
        name: `${code} Queue Test`,
        status: 'ACTIVE',
        priority,
        trackingStartDate: startDate,
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: code,
        filenamePattern: /\.xlsx$/i,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir: path.join(os.tmpdir(), 'unused-auto-backfill-queue-artifacts', code),
        lanes,
    };
}

async function createFixture({
    indicators = null,
    execute = null,
    now = '2026-01-04T01:00:00.000Z',
    leaseMs = 1000,
} = {}) {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-queue-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyAutoBackfillQueueSchema(dbPath);
    await applyAutoBackfillSafetySchema(dbPath);
    const statuses = new Map();
    const clockState = { now: new Date(now) };
    const registry = indicators?.(statuses) || [
        createIndicator({ code: 'F9.A', priority: 10, startDate: '2026-01-02', laneCodes: ['HUE', 'TCT'], statuses }),
        createIndicator({ code: 'F9.B', priority: 20, startDate: '2026-01-02', laneCodes: ['HUE'], statuses }),
    ];
    const calls = [];
    const executorRegistry = new AutoBackfillExecutorRegistry({ allowTestExecutors: true });
    for (const registration of registry) {
        for (const lane of Object.values(registration.lanes)) {
            executorRegistry.register(lane.portalAdapter.id, {
                async execute(identity) {
                    calls.push(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`);
                    if (execute) await execute(identity, statuses);
                    else statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
                },
            }, { verified: true, testOnly: true });
        }
    }
    const coverageService = new AutoBackfillCoverageService({
        db: {},
        clock: () => clockState.now,
        registryProvider: () => registry,
        registryVersion: 'QUEUE-TEST-1',
    });
    function makeService(workerId) {
        return new AutoBackfillQueueService({
            store: new AutoBackfillQueueStore({ dbPath, clock: () => clockState.now, leaseMs }),
            coverageService,
            executorRegistry,
            registryProvider: () => registry,
            registryVersion: 'QUEUE-TEST-1',
            completionDb: {},
            fsImpl: { existsSync: () => false },
            workerId,
            heartbeatMs: 100000,
        });
    }
    return {
        dbPath,
        statuses,
        clockState,
        registry,
        calls,
        service: makeService('worker-a'),
        makeService,
        cleanup() { fs.rmSync(dbPath, { force: true }); },
    };
}

test('AB-QUE-01 persists deterministic priority and permits exactly one global RUNNING job', async () => {
    const started = deferred();
    const release = deferred();
    let first = true;
    const fixture = await createFixture({ execute: async (identity, statuses) => {
        if (first) {
            first = false;
            started.resolve();
            await release.promise;
        }
        statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
    } });
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        assert.deepEqual(created.jobs.map((job) => `${job.business_date}|${job.indicator}|${job.source_lane}`), [
            '2026-01-03|F9.A|HUE',
            '2026-01-03|F9.A|TCT',
            '2026-01-03|F9.B|HUE',
            '2026-01-02|F9.A|HUE',
            '2026-01-02|F9.A|TCT',
            '2026-01-02|F9.B|HUE',
        ]);

        const firstWork = fixture.service.processNext();
        await started.promise;
        assert.equal(await fixture.makeService('worker-b').processNext(), null);
        const during = await fixture.service.store.getRun(created.run.id);
        assert.equal(during.jobs.filter((job) => job.state === 'RUNNING').length, 1);
        release.resolve();
        await firstWork;
        while (await fixture.service.processNext()) { /* drain deterministic test work */ }
        assert.deepEqual(fixture.calls, created.jobs.map((job) => `${job.indicator}|${job.source_lane}|${job.business_date}`));
    } finally {
        fixture.cleanup();
    }
});

test('createRun with no from_date/to_date enqueues the full coverage-eligible window (unchanged behavior)', async () => {
    const fixture = await createFixture();
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        assert.deepEqual(created.jobs.map((job) => job.business_date).sort(), ['2026-01-02', '2026-01-02', '2026-01-02', '2026-01-03', '2026-01-03', '2026-01-03']);
    } finally {
        fixture.cleanup();
    }
});

test('createRun with only from_date keeps every eligible date on or after it', async () => {
    const fixture = await createFixture();
    try {
        const created = await fixture.service.createRun({ fromDate: '2026-01-03', actor: 'admin', roles: ['admin'] });
        assert.deepEqual(new Set(created.jobs.map((job) => job.business_date)), new Set(['2026-01-03']));
        assert.equal(created.jobs.length, 3);
    } finally {
        fixture.cleanup();
    }
});

test('createRun with only to_date keeps every eligible date on or before it', async () => {
    const fixture = await createFixture();
    try {
        const created = await fixture.service.createRun({ toDate: '2026-01-02', actor: 'admin', roles: ['admin'] });
        assert.deepEqual(new Set(created.jobs.map((job) => job.business_date)), new Set(['2026-01-02']));
        assert.equal(created.jobs.length, 3);
    } finally {
        fixture.cleanup();
    }
});

test('createRun with from_date and to_date enqueues only the inclusive range', async () => {
    const fixture = await createFixture();
    try {
        const created = await fixture.service.createRun({ fromDate: '2026-01-02', toDate: '2026-01-02', actor: 'admin', roles: ['admin'] });
        assert.deepEqual(new Set(created.jobs.map((job) => job.business_date)), new Set(['2026-01-02']));
        assert.equal(created.jobs.length, 3);
    } finally {
        fixture.cleanup();
    }
});

test('createRun scoped to one specific calendar month enqueues exactly that month and nothing outside it', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2025-11-15', laneCodes: ['HUE'], statuses })],
        now: '2026-01-04T01:00:00.000Z',
    });
    try {
        const created = await fixture.service.createRun({ fromDate: '2025-12-01', toDate: '2025-12-31', actor: 'admin', roles: ['admin'] });
        const dates = created.jobs.map((job) => job.business_date).sort();
        assert.equal(dates.length, 31);
        assert.equal(dates[0], '2025-12-01');
        assert.equal(dates.at(-1), '2025-12-31');
        assert.ok(dates.every((date) => date >= '2025-12-01' && date <= '2025-12-31'));
        assert.ok(!dates.some((date) => date.startsWith('2025-11') || date.startsWith('2026-01')));
    } finally {
        fixture.cleanup();
    }
});

test('createRun rejects from_date after to_date with 400 before any scan or write', async () => {
    const fixture = await createFixture();
    try {
        await assert.rejects(
            fixture.service.createRun({ fromDate: '2026-01-03', toDate: '2026-01-02', actor: 'admin', roles: ['admin'] }),
            (error) => error.code === 'AUTO_BACKFILL_DATE_RANGE_INVALID' && error.statusCode === 400,
        );
        assert.equal(await fixture.service.store.countRows('auto_backfill_run'), 0);
        assert.equal(await fixture.service.store.countRows('auto_backfill_job'), 0);
    } finally {
        fixture.cleanup();
    }
});

test('createRun rejects a malformed from_date/to_date the same way as every other business-date validator', async () => {
    const fixture = await createFixture();
    try {
        await assert.rejects(
            fixture.service.createRun({ fromDate: '2026-02-30', actor: 'admin', roles: ['admin'] }),
            (error) => error.code === 'INVALID_DATE' && error.statusCode === 400,
        );
        await assert.rejects(
            fixture.service.createRun({ toDate: 'not-a-date', actor: 'admin', roles: ['admin'] }),
            (error) => error.code === 'INVALID_DATE' && error.statusCode === 400,
        );
        assert.equal(await fixture.service.store.countRows('auto_backfill_run'), 0);
    } finally {
        fixture.cleanup();
    }
});

test('createRun with a from_date/to_date window matching no eligible coverage rejects with the existing no-executable-coverage error', async () => {
    const fixture = await createFixture();
    try {
        await assert.rejects(
            fixture.service.createRun({ fromDate: '2020-01-01', toDate: '2020-01-31', actor: 'admin', roles: ['admin'] }),
            (error) => error.code === 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE' && error.statusCode === 409,
        );
    } finally {
        fixture.cleanup();
    }
});

test('AB-QUE-02 pause lets the atomic job finish, blocks the next lease, and resume continues', async () => {
    const started = deferred();
    const release = deferred();
    let blocked = true;
    const fixture = await createFixture({
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2026-01-02', laneCodes: ['HUE'], statuses })],
        execute: async (identity, statuses) => {
            if (blocked) {
                blocked = false;
                started.resolve();
                await release.promise;
            }
            statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
        },
    });
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const active = fixture.service.processNext();
        await started.promise;
        assert.equal((await fixture.service.pauseRun(created.run.id, { actor: 'admin', roles: ['admin'] })).run.status, 'PAUSING');
        assert.equal(await fixture.makeService('worker-b').processNext(), null);
        release.resolve();
        await active;
        assert.equal((await fixture.service.store.getRun(created.run.id)).run.status, 'PAUSED');
        assert.equal(await fixture.service.processNext(), null);
        await fixture.service.resumeRun(created.run.id, { actor: 'admin', roles: ['admin'] });
        assert.equal((await fixture.service.processNext()).state, 'SUCCESS');
        assert.equal((await fixture.service.store.getRun(created.run.id)).run.status, 'COMPLETED');
    } finally {
        fixture.cleanup();
    }
});

test('AB-QUE-03 restart recovery rechecks interrupted work and preserves explicit PAUSED', async () => {
    const fixture = await createFixture({ leaseMs: 100 });
    try {
        const runA = await fixture.service.createRun({ indicator: 'F9.A', actor: 'admin', roles: ['admin'] });
        await fixture.service.pauseRun(runA.run.id, { actor: 'admin', roles: ['admin'] });
        const runB = await fixture.service.createRun({ indicator: 'F9.B', actor: 'admin', roles: ['admin'] });
        const leased = await fixture.service.store.acquireNextJob('crashed-worker');
        assert.equal(leased.run_id, runB.run.id);
        fixture.clockState.now = new Date(fixture.clockState.now.getTime() + 1000);

        const recovered = await fixture.makeService('restarted-worker').recoverInterruptedWork();
        assert.equal(recovered.length, 1);
        assert.equal(recovered[0].state, 'QUEUED');
        assert.equal((await fixture.service.store.getRun(runA.run.id)).run.status, 'PAUSED');
        assert.equal((await fixture.service.store.getRun(runB.run.id)).jobs[0].state, 'QUEUED');
    } finally {
        fixture.cleanup();
    }
});

test('AB-SUC-01 externally completed queued work skips the executor before lease execution', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2026-01-03', laneCodes: ['HUE'], statuses })],
    });
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        fixture.statuses.set('F9.TEST|HUE|2026-01-03', 'SUCCESS');
        assert.equal((await fixture.service.processNext()).state, 'SKIPPED_ALREADY_SUCCESS');
        assert.equal(fixture.calls.length, 0);
        assert.equal((await fixture.service.store.getRun(created.run.id)).jobs[0].state, 'SKIPPED_ALREADY_SUCCESS');
    } finally {
        fixture.cleanup();
    }
});

test('AB-SUC-02 recovery detects completion after simulated commit crash and never executes twice', async () => {
    const fixture = await createFixture({
        leaseMs: 100,
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2026-01-03', laneCodes: ['HUE'], statuses })],
    });
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        assert.equal((await fixture.service.processNext({ simulateCrashAfterExecutor: true })).state, 'SIMULATED_CRASH');
        assert.equal(fixture.calls.length, 1);
        fixture.clockState.now = new Date(fixture.clockState.now.getTime() + 1000);
        await fixture.makeService('restarted-worker').recoverInterruptedWork();
        const recovered = await fixture.service.store.getRun(created.run.id);
        assert.equal(recovered.jobs[0].state, 'SKIPPED_ALREADY_SUCCESS');
        assert.equal(await fixture.service.processNext(), null);
        assert.equal(fixture.calls.length, 1);
    } finally {
        fixture.cleanup();
    }
});

test('competing workers on separate SQLite connections cannot lease two jobs', async () => {
    const fixture = await createFixture();
    try {
        await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const [left, right] = await Promise.all([
            fixture.service.store.acquireNextJob('process-one'),
            fixture.makeService('process-two').store.acquireNextJob('process-two'),
        ]);
        assert.equal([left, right].filter(Boolean).length, 1);
        assert.equal(await fixture.service.store.countRows('auto_backfill_worker_lease'), 1);
        const run = await fixture.service.store.getRun((left || right).run_id);
        assert.equal(run.jobs.filter((job) => job.state === 'RUNNING').length, 1);
    } finally {
        fixture.cleanup();
    }
});

test('duplicate create is idempotent and never duplicates active exact identities', async () => {
    const fixture = await createFixture();
    try {
        const first = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const second = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        assert.equal(second.run.id, first.run.id);
        assert.equal(second.creation.created, false);
        assert.equal(await fixture.service.store.countRows('auto_backfill_run'), 1);
        assert.equal(await fixture.service.store.countRows('auto_backfill_job'), first.jobs.length);
    } finally {
        fixture.cleanup();
    }
});

test('registry read permission filters jobs and a read performs no queue write', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => [
            createIndicator({
                code: 'F9.TEST',
                priority: 10,
                startDate: '2026-01-03',
                laneCodes: ['HUE'],
                statuses,
                readRoles: ['admin', 'viewer'],
            }),
        ],
    });
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        const eventsBefore = await fixture.service.store.countRows('auto_backfill_event');
        const visible = await fixture.service.getRun(created.run.id, { roles: ['viewer'] });
        assert.equal(visible.jobs.length, 1);
        assert.equal(visible.jobs[0].indicator, 'F9.TEST');
        assert.equal(await fixture.service.store.countRows('auto_backfill_event'), eventsBefore);
        await assert.rejects(
            fixture.service.pauseRun(created.run.id, { actor: 'viewer', roles: ['viewer'] }),
            (error) => error.code === 'AUTO_BACKFILL_ADMIN_REQUIRED' && error.statusCode === 403,
        );
        assert.equal((await fixture.service.store.getRun(created.run.id)).run.status, 'RUNNING');
    } finally {
        fixture.cleanup();
    }
});

test('production-style empty executor registry fails closed before persisting jobs', async () => {
    const fixture = await createFixture();
    try {
        const closed = new AutoBackfillQueueService({
            store: fixture.service.store,
            coverageService: fixture.service.coverageService,
            executorRegistry: new AutoBackfillExecutorRegistry(),
            registryProvider: () => fixture.registry,
            completionDb: {},
        });
        await assert.rejects(
            closed.createRun({ actor: 'admin', roles: ['admin'] }),
            (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_NOT_AVAILABLE' && error.statusCode === 503,
        );
        assert.equal(await fixture.service.store.countRows('auto_backfill_run'), 0);
    } finally {
        fixture.cleanup();
    }
});

test('coordinator wakes on run creation and drains with an injected verified executor', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2026-01-03', laneCodes: ['HUE'], statuses })],
    });
    const coordinator = attachCoordinator(fixture.service, fixture.clockState);
    try {
        coordinator.start();
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        await eventually(async () => (await fixture.service.store.getRun(created.run.id)).run.status === 'COMPLETED');
        assert.deepEqual(fixture.calls, ['F9.TEST|HUE|2026-01-03']);
        await eventually(() => !coordinator.snapshot().draining && !coordinator.snapshot().timerScheduled);
    } finally {
        await coordinator.stop();
        fixture.cleanup();
    }
});

test('coordinator wakes on Resume and drains remaining persisted work', async () => {
    const started = deferred();
    const release = deferred();
    let first = true;
    const fixture = await createFixture({
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2026-01-02', laneCodes: ['HUE'], statuses })],
        execute: async (identity, statuses) => {
            if (first) {
                first = false;
                started.resolve();
                await release.promise;
            }
            statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
        },
    });
    const coordinator = attachCoordinator(fixture.service, fixture.clockState);
    try {
        coordinator.start();
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        await started.promise;
        await fixture.service.pauseRun(created.run.id, { actor: 'admin', roles: ['admin'] });
        release.resolve();
        await eventually(async () => (await fixture.service.store.getRun(created.run.id)).run.status === 'PAUSED');
        assert.equal(fixture.calls.length, 1);
        await fixture.service.resumeRun(created.run.id, { actor: 'admin', roles: ['admin'] });
        await eventually(async () => (await fixture.service.store.getRun(created.run.id)).run.status === 'COMPLETED');
        assert.equal(fixture.calls.length, 2);
    } finally {
        release.resolve();
        await coordinator.stop();
        fixture.cleanup();
    }
});

test('restart coordinator waits for lease safety, recovers, and continues interrupted work', async () => {
    const fixture = await createFixture({
        leaseMs: 20,
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2026-01-03', laneCodes: ['HUE'], statuses })],
    });
    let coordinator;
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        await fixture.service.store.acquireNextJob('crashed-process');
        coordinator = attachCoordinator(fixture.makeService('restarted-process'), fixture.clockState);
        coordinator.start();
        await eventually(() => coordinator.snapshot().timerScheduled);
        assert.equal(fixture.calls.length, 0);
        fixture.clockState.now = new Date(fixture.clockState.now.getTime() + 1000);
        await eventually(async () => (await fixture.service.store.getRun(created.run.id)).run.status === 'COMPLETED');
        assert.equal(fixture.calls.length, 1);
        const attempts = (await fixture.service.store.getRun(created.run.id)).attempts;
        assert.deepEqual(attempts.map((attempt) => attempt.status), ['INTERRUPTED', 'SUCCESS']);
    } finally {
        if (coordinator) await coordinator.stop();
        fixture.cleanup();
    }
});

test('PAUSED run remains dormant across coordinator restart', async () => {
    const fixture = await createFixture({
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2026-01-03', laneCodes: ['HUE'], statuses })],
    });
    const coordinator = attachCoordinator(fixture.makeService('restarted-process'), fixture.clockState);
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        await fixture.service.pauseRun(created.run.id, { actor: 'admin', roles: ['admin'] });
        coordinator.start();
        await eventually(() => !coordinator.snapshot().draining);
        const snapshot = coordinator.snapshot();
        await new Promise((resolve) => setTimeout(resolve, 30));
        assert.equal((await fixture.service.store.getRun(created.run.id)).run.status, 'PAUSED');
        assert.equal(fixture.calls.length, 0);
        assert.equal(coordinator.snapshot().processNextCount, snapshot.processNextCount);
        assert.equal(coordinator.snapshot().timerScheduled, false);
    } finally {
        await coordinator.stop();
        fixture.cleanup();
    }
});

test('two coordinators still execute at most one job concurrently', async () => {
    const release = deferred();
    let concurrent = 0;
    let maxConcurrent = 0;
    let first = true;
    const fixture = await createFixture({
        indicators: (statuses) => [createIndicator({ code: 'F9.TEST', priority: 10, startDate: '2026-01-02', laneCodes: ['HUE'], statuses })],
        execute: async (identity, statuses) => {
            concurrent += 1;
            maxConcurrent = Math.max(maxConcurrent, concurrent);
            if (first) {
                first = false;
                await release.promise;
            }
            statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
            concurrent -= 1;
        },
    });
    const coordinatorA = attachCoordinator(fixture.service, fixture.clockState);
    const coordinatorB = attachCoordinator(fixture.makeService('worker-b'), fixture.clockState);
    try {
        const created = await fixture.service.createRun({ actor: 'admin', roles: ['admin'] });
        coordinatorA.start();
        coordinatorB.start();
        await eventually(() => concurrent === 1);
        await new Promise((resolve) => setTimeout(resolve, 30));
        assert.equal(maxConcurrent, 1);
        assert.equal(await fixture.service.store.countRows('auto_backfill_worker_lease'), 1);
        release.resolve();
        await eventually(async () => (await fixture.service.store.getRun(created.run.id)).run.status === 'COMPLETED');
        assert.equal(maxConcurrent, 1);
        assert.equal(fixture.calls.length, 2);
    } finally {
        release.resolve();
        await Promise.all([coordinatorA.stop(), coordinatorB.stop()]);
        fixture.cleanup();
    }
});

test('empty executor runtime becomes dormant without polling or execution', async () => {
    const fixture = await createFixture();
    const closedService = new AutoBackfillQueueService({
        store: fixture.service.store,
        coverageService: fixture.service.coverageService,
        executorRegistry: new AutoBackfillExecutorRegistry(),
        registryProvider: () => fixture.registry,
        completionDb: {},
    });
    const coordinator = attachCoordinator(closedService, fixture.clockState);
    try {
        coordinator.start();
        await eventually(() => !coordinator.snapshot().draining);
        const snapshot = coordinator.snapshot();
        await new Promise((resolve) => setTimeout(resolve, 30));
        assert.equal(fixture.calls.length, 0);
        assert.equal(coordinator.snapshot().processNextCount, snapshot.processNextCount);
        assert.equal(coordinator.snapshot().timerScheduled, false);
    } finally {
        await coordinator.stop();
        fixture.cleanup();
    }
});

test('coordinator stop clears a pending lease timer without handle leakage', async () => {
    let timerCreated = 0;
    let timerCleared = 0;
    const fakeTimer = { unref() {} };
    const queueService = {
        async processNext() { return null; },
        store: {
            async getCoordinatorState() {
                return {
                    eligibleJobCount: 1,
                    runningJobCount: 1,
                    leaseExpiresAt: '2098-01-01T00:00:00.000Z',
                };
            },
        },
    };
    const coordinator = new AutoBackfillWorkerCoordinator({
        queueService,
        minPollMs: 5,
        maxPollMs: 25,
        setTimer() { timerCreated += 1; return fakeTimer; },
        clearTimer(timer) { assert.equal(timer, fakeTimer); timerCleared += 1; },
    });
    coordinator.start();
    await eventually(() => coordinator.snapshot().timerScheduled);
    await coordinator.stop();
    assert.equal(timerCreated, 1);
    assert.equal(timerCleared, 1);
    assert.deepEqual(coordinator.snapshot(), {
        started: false,
        draining: false,
        timerScheduled: false,
        wakeCount: 1,
        drainCount: 1,
        processNextCount: 1,
        timerCount: 1,
    });
});

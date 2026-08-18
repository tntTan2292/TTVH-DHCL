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
    DEFAULT_ERROR_MAP,
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

async function eventually(predicate, { timeoutMs = 2000, intervalMs = 10 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
        last = await predicate();
        if (last) return last;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    assert.fail(`Condition was not met within ${timeoutMs}ms; last value: ${JSON.stringify(last)}`);
}

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

function error(code, classification = null, message = code) {
    const value = new Error(message);
    value.code = code;
    if (classification) value.autoBackfill = { classification };
    return value;
}

function createIndicator({ statuses, startDate = '2026-01-04', lanes = ['HUE'], retryPolicy = DEFAULT_RETRY_POLICY }) {
    const code = 'F9.TEST';
    const filenameDateRule = createFilenameDateRule({ id: 'F9_TEST_DATE', prefix: code, parse: () => startDate });
    return {
        code,
        key: code,
        name: 'Synthetic Safety Indicator',
        status: 'ACTIVE',
        priority: 10,
        trackingStartDate: startDate,
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: code,
        filenamePattern: /\.xlsx$/i,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir: path.join(os.tmpdir(), 'unused-auto-backfill-safety-artifacts'),
        lanes: Object.fromEntries(lanes.map((laneCode, index) => {
            const adapterId = `SYNTHETIC_${laneCode}_ADAPTER`;
            return [laneCode, {
                code: laneCode,
                priority: (index + 1) * 10,
                parser: () => ({ parsedData: [] }),
                targetTable: `fact_f9_test_${laneCode.toLowerCase()}`,
                completionPolicy: {
                    id: `F9_TEST_${laneCode}_COMPLETION`,
                    async evaluate({ indicator, lane, businessDate }) {
                        const key = `${indicator.code}|${lane.code}|${businessDate}`;
                        const status = statuses.get(key) || 'MISSING';
                        return { status, evidence: { key, status } };
                    },
                },
                automationMode: 'AUTOMATED',
                manualOnlyReason: null,
                portalAdapter: {
                    id: adapterId,
                    verified: true,
                    reportIdentity: `REPORT_${laneCode}`,
                    resourceIdentity: `RESOURCE_${laneCode}`,
                },
                permissions: {
                    ...DEFAULT_PERMISSIONS,
                    coverageReadRoles: ['admin', 'viewer'],
                    auditReadRoles: ['admin', 'viewer'],
                },
                retryPolicy,
                errorMap: DEFAULT_ERROR_MAP,
                circuitScope: CIRCUIT_SCOPE,
            }];
        })),
    };
}

async function fixture({ execute, sessionValid = () => true, startDate, lanes, now = '2026-01-05T01:00:00.000Z', retryPolicy } = {}) {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-safety-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyAutoBackfillQueueSchema(dbPath);
    await applyAutoBackfillSafetySchema(dbPath);
    const statuses = new Map();
    const clockState = { now: new Date(now) };
    const indicator = createIndicator({ statuses, startDate, lanes, retryPolicy });
    const calls = [];
    const executors = new AutoBackfillExecutorRegistry({ allowTestExecutors: true });
    for (const lane of Object.values(indicator.lanes)) {
        executors.register(lane.portalAdapter.id, {
            async validateSession() {
                if (!sessionValid(lane.code)) throw error('AUTHENTICATION_REQUIRED');
                return { status: 'SESSION_VALID' };
            },
            async execute(identity) {
                calls.push(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`);
                await execute?.(identity, { statuses, calls });
            },
        }, { verified: true, testOnly: true });
    }
    const coverageService = new AutoBackfillCoverageService({
        db: {},
        clock: () => clockState.now,
        registryProvider: () => [indicator],
        registryVersion: 'SAFETY-TEST-1',
    });
    const makeService = (workerId = 'safety-worker') => new AutoBackfillQueueService({
        store: new AutoBackfillQueueStore({ dbPath, clock: () => clockState.now, leaseMs: 100 }),
        coverageService,
        executorRegistry: executors,
        registryProvider: () => [indicator],
        registryVersion: 'SAFETY-TEST-1',
        completionDb: {},
        fsImpl: { existsSync: () => false },
        workerId,
        heartbeatMs: 100000,
    });
    return {
        dbPath,
        statuses,
        clockState,
        indicator,
        calls,
        service: makeService(),
        makeService,
        cleanup() { fs.rmSync(dbPath, { force: true }); },
    };
}

test('Safety retries only an explicit transient error, at most three attempts, with persisted bounded exponential backoff', async () => {
    let attempts = 0;
    const f = await fixture({ startDate: '2026-01-04', execute: async (identity, { statuses }) => {
        attempts += 1;
        if (attempts < 3) throw error('PORTAL_TRANSIENT', null, 'temporary upstream timeout');
        statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        const first = await f.service.processNext();
        assert.equal(first.state, 'RETRY_WAIT');
        assert.equal(first.retryAt, '2026-01-05T01:00:02.000Z');
        assert.equal(await f.service.processNext(), null);
        f.clockState.now = new Date('2026-01-05T01:00:02.000Z');
        const second = await f.service.processNext();
        assert.equal(second.retryAt, '2026-01-05T01:00:06.000Z');
        f.clockState.now = new Date('2026-01-05T01:00:06.000Z');
        assert.equal((await f.service.processNext()).state, 'SUCCESS');
        const run = await f.service.store.getRun(created.run.id);
        assert.deepEqual(run.attempts.map((item) => item.effective_status), ['RETRY_SCHEDULED', 'RETRY_SCHEDULED', 'SUCCESS']);
        assert.equal(run.run.status, 'COMPLETED');
    } finally {
        f.cleanup();
    }
});

test('Safety exhausts a transient job after exactly three attempts', async () => {
    const f = await fixture({ startDate: '2026-01-04', execute: async () => {
        throw error('PORTAL_TRANSIENT', null, 'temporary upstream timeout');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        assert.equal((await f.service.processNext()).state, 'RETRY_WAIT');
        f.clockState.now = new Date(f.clockState.now.getTime() + 2000);
        assert.equal((await f.service.processNext()).state, 'RETRY_WAIT');
        f.clockState.now = new Date(f.clockState.now.getTime() + 4000);
        assert.equal((await f.service.processNext()).state, 'FAILED_TERMINAL');
        assert.equal(await f.service.processNext(), null);
        const run = await f.service.store.getRun(created.run.id);
        assert.equal(run.attempts.length, 3);
        assert.equal(run.jobs[0].state, 'FAILED_TERMINAL');
        assert.match(run.jobs[0].action_required, /limit of 3 attempts/i);
    } finally {
        f.cleanup();
    }
});

test('pause during a transient attempt persists retry work and Resume continues from that position', async () => {
    const started = deferred();
    const release = deferred();
    let first = true;
    const f = await fixture({ startDate: '2026-01-04', execute: async (identity, { statuses }) => {
        if (first) {
            first = false;
            started.resolve();
            await release.promise;
            throw error('PORTAL_TRANSIENT');
        }
        statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        const active = f.service.processNext();
        await started.promise;
        assert.equal((await f.service.pauseRun(created.run.id, { actor: 'admin', roles: ['admin'] })).run.status, 'PAUSING');
        release.resolve();
        assert.equal((await active).state, 'RETRY_WAIT');
        assert.equal((await f.service.store.getRun(created.run.id)).run.status, 'PAUSED');
        f.clockState.now = new Date(f.clockState.now.getTime() + 30000);
        assert.equal(await f.service.processNext(), null);
        await f.service.resumeRun(created.run.id, { actor: 'admin', roles: ['admin'] });
        assert.equal((await f.service.processNext()).state, 'SUCCESS');
        const run = await f.service.store.getRun(created.run.id);
        assert.ok(run.events.some((event) => event.reason_code === 'PAUSE_REQUESTED'));
        assert.ok(run.events.some((event) => event.reason_code === 'RESUME_REQUESTED'));
    } finally {
        release.resolve();
        f.cleanup();
    }
});

test('Safety never retries data or permission failures and isolates each exact date', async () => {
    const f = await fixture({ startDate: '2026-01-03', execute: async (identity) => {
        if (identity.businessDate === '2026-01-04') throw error('MANUAL_REVIEW_REQUIRED');
        throw error('PERMISSION_DENIED');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        assert.equal((await f.service.processNext()).state, 'FAILED_TERMINAL');
        assert.equal((await f.service.processNext()).state, 'FAILED_TERMINAL');
        const report = await f.service.getReport(created.run.id, { roles: ['admin'] });
        assert.deepEqual(report.items.map((item) => item.attempt_count), [1, 1]);
        assert.deepEqual(report.items.map((item) => item.classification), ['DATA', 'PERMISSION']);
        assert.equal(f.calls.length, 2);
    } finally {
        f.cleanup();
    }
});

test('five same-signature system failures open only the exact adapter/source/resource circuit', async () => {
    const f = await fixture({ startDate: '2026-01-02', lanes: ['HUE', 'TCT'], execute: async (identity, { statuses }) => {
        if (identity.sourceLane === 'TCT') {
            statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
            return;
        }
        throw error('PORTAL_TRANSIENT', null, 'same system signature');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        for (let n = 0; n < 20; n += 1) {
            const result = await f.service.processNext();
            if (!result) {
                f.clockState.now = new Date(f.clockState.now.getTime() + 30000);
                continue;
            }
            if (result.state === 'CIRCUIT_OPEN') break;
        }
        const run = await f.service.store.getRun(created.run.id);
        const hueCircuit = run.circuits.find((item) => item.source_lane === 'HUE');
        assert.equal(hueCircuit.state, 'OPEN');
        assert.equal(hueCircuit.consecutive_count, 5);
        assert.ok(run.jobs.filter((job) => job.source_lane === 'HUE').some((job) => job.safety_state === 'CIRCUIT_OPEN'));
        while (await f.service.processNext()) { /* other scope remains eligible */ }
        const after = await f.service.store.getRun(created.run.id);
        assert.ok(after.jobs.filter((job) => job.source_lane === 'TCT').every((job) => job.state === 'SUCCESS'));
    } finally {
        f.cleanup();
    }
});

test('open circuit survives restart and Admin reset explicitly releases its persisted scope', async () => {
    let healthy = false;
    const f = await fixture({ startDate: '2026-01-02', execute: async (identity, { statuses }) => {
        if (!healthy) throw error('PORTAL_TRANSIENT', null, 'same persisted system signature');
        statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        for (let n = 0; n < 20; n += 1) {
            const result = await f.service.processNext();
            if (result?.state === 'CIRCUIT_OPEN') break;
            if (!result) f.clockState.now = new Date(f.clockState.now.getTime() + 30000);
        }
        const restarted = f.makeService('restarted-worker');
        assert.equal(await restarted.processNext(), null);
        assert.equal((await restarted.store.getRun(created.run.id)).circuits[0].state, 'OPEN');
        healthy = true;
        await restarted.resetCircuits(created.run.id, { actor: 'admin', roles: ['admin'] });
        assert.equal((await restarted.processNext()).state, 'SUCCESS');
        const after = await restarted.store.getRun(created.run.id);
        assert.equal(after.circuits[0].state, 'CLOSED');
        assert.ok(after.events.some((event) => event.event_type === 'CIRCUIT_RESET'));
    } finally {
        f.cleanup();
    }
});

test('mixed system signatures do not accumulate and a later success resets the exact scope counter', async () => {
    let index = 0;
    const f = await fixture({ startDate: '2026-01-02', execute: async (identity, { statuses }) => {
        index += 1;
        if (index === 3) {
            statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
            return;
        }
        throw error(index === 1 ? 'SYSTEM_A' : 'SYSTEM_B', 'SYSTEM', `system-${index}`);
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        assert.equal((await f.service.processNext()).state, 'FAILED_TERMINAL');
        assert.equal((await f.service.processNext()).state, 'FAILED_TERMINAL');
        assert.equal((await f.service.processNext()).state, 'SUCCESS');
        const run = await f.service.store.getRun(created.run.id);
        assert.equal(run.circuits[0].state, 'CLOSED');
        assert.equal(run.circuits[0].consecutive_count, 0);
        assert.ok(run.events.some((event) => event.event_type === 'CIRCUIT_RESET_ON_SUCCESS'));
    } finally {
        f.cleanup();
    }
});

test('authentication loss persists WAITING_AUTH, stops drain, and explicit Resume continues the exact job', async () => {
    let authenticated = false;
    const f = await fixture({ startDate: '2026-01-04', sessionValid: () => authenticated, execute: async (identity, { statuses }) => {
        if (!authenticated) throw error('AUTHENTICATION_REQUIRED', null, 'manual login required');
        statuses.set(`${identity.indicator}|${identity.sourceLane}|${identity.businessDate}`, 'SUCCESS');
    } });
    const coordinator = new AutoBackfillWorkerCoordinator({
        queueService: f.service,
        clock: () => f.clockState.now,
        minPollMs: 5,
        maxPollMs: 25,
        onError() {},
    });
    f.service.setWorkAvailableNotifier(() => coordinator.wake());
    try {
        coordinator.start();
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        await eventually(async () => (await f.service.store.getRun(created.run.id)).run.safety_state === 'WAITING_AUTH');
        await new Promise((resolve) => setTimeout(resolve, 30));
        assert.equal(f.calls.length, 1);
        await assert.rejects(
            f.service.resumeRun(created.run.id, { actor: 'admin', roles: ['admin'] }),
            (value) => value.code === 'AUTHENTICATION_REQUIRED',
        );
        assert.equal((await f.service.store.getRun(created.run.id)).run.safety_state, 'WAITING_AUTH');
        authenticated = true;
        await f.service.resumeRun(created.run.id, { actor: 'admin', roles: ['admin'] });
        await eventually(async () => (await f.service.store.getRun(created.run.id)).run.status === 'COMPLETED');
        const run = await f.service.store.getRun(created.run.id);
        assert.equal(f.calls.length, 2);
        assert.deepEqual(run.attempts.map((item) => item.effective_status), ['WAITING_AUTH', 'SUCCESS']);
        assert.ok(run.events.some((event) => event.event_type === 'AUTH_WAIT_RESUMED'));
    } finally {
        await coordinator.stop();
        f.cleanup();
    }
});

test('integrity fatal stops immediately on the first attempt and blocks later jobs', async () => {
    const f = await fixture({ startDate: '2026-01-03', execute: async () => {
        throw error('INTEGRITY_FATAL');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        await assert.rejects(f.service.processNext(), (value) => value.code === 'AUTO_BACKFILL_INTEGRITY_BLOCKED');
        assert.equal(await f.service.processNext(), null);
        const run = await f.service.store.getRun(created.run.id);
        assert.equal(run.run.safety_state, 'BLOCKED_INTEGRITY');
        assert.equal(run.attempts.length, 1);
        assert.equal(f.calls.length, 1);
    } finally {
        f.cleanup();
    }
});

test('external SUCCESS during retry wait is rechecked and never executes again', async () => {
    const f = await fixture({ startDate: '2026-01-04', execute: async () => {
        throw error('PORTAL_TRANSIENT');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        assert.equal((await f.service.processNext()).state, 'RETRY_WAIT');
        f.statuses.set('F9.TEST|HUE|2026-01-04', 'SUCCESS');
        f.clockState.now = new Date(f.clockState.now.getTime() + 30000);
        assert.equal((await f.makeService('restarted-worker').processNext()).state, 'SKIPPED_ALREADY_SUCCESS');
        assert.equal(f.calls.length, 1);
        assert.equal((await f.service.store.getRun(created.run.id)).run.status, 'COMPLETED');
    } finally {
        f.cleanup();
    }
});

test('append-only audit and PO report expose actionable sanitized identity without secrets', async () => {
    const f = await fixture({ startDate: '2026-01-04', execute: async () => {
        throw error('SYSTEM_SECRET', 'SYSTEM', 'token=abc123 cookie=session-secret https://portal.invalid?q=secret');
    } });
    try {
        const created = await f.service.createRun({ actor: 'admin', roles: ['admin'] });
        await f.service.processNext();
        const report = await f.service.getReport(created.run.id, { roles: ['viewer'] });
        assert.deepEqual(Object.keys(report.items[0]), [
            'indicator', 'source_lane', 'business_date', 'state', 'error_signature',
            'classification', 'attempt_count', 'action_required',
        ]);
        assert.equal(report.items[0].indicator, 'F9.TEST');
        assert.equal(report.items[0].attempt_count, 1);
        const serialized = JSON.stringify(await f.service.getEvents(created.run.id, { roles: ['viewer'] }));
        assert.doesNotMatch(serialized, /abc123|session-secret|portal\.invalid|q=secret/i);
        assert.match(report.items[0].error_signature, /^SYSTEM_SECRET:[0-9a-f]{16}$/);
        assert.ok(report.items[0].action_required);
        f.indicator.lanes.HUE.permissions.auditReadRoles = ['admin'];
        await assert.rejects(
            f.service.getReport(created.run.id, { roles: ['viewer'] }),
            (value) => value.code === 'AUTO_BACKFILL_RUN_FORBIDDEN' && value.statusCode === 403,
        );
    } finally {
        f.cleanup();
    }
});

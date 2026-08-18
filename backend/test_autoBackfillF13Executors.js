'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');
const {
    F13_EXECUTOR_IDENTITIES,
    createF13AutoBackfillExecutors,
    registerF13AutoBackfillExecutors,
} = require('./src/services/autoBackfillF13Executors');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { buildRuntime } = require('./src/services/autoBackfillQueueRuntime');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const { AutoBackfillWorkerCoordinator } = require('./src/services/autoBackfillWorkerCoordinator');
const { HueF13Adapter, TctF13Adapter } = require('./src/services/f13Adapters');
const {
    DEFAULT_PERMISSIONS,
    DEFAULT_RETRY_POLICY,
    INDICATORS,
    createFilenameDateRule,
} = require('./src/services/importIndicatorRegistry');

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

async function eventually(predicate, timeoutMs = 1000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const result = await predicate();
        if (result) return result;
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.fail(`Condition was not met within ${timeoutMs}ms.`);
}

function createSessionHarness() {
    const calls = [];
    const entries = {
        HUE: { authenticated: true, activeOperation: null },
        TCT: { authenticated: true, activeOperation: null },
    };
    const clients = { HUE: { source: 'HUE' }, TCT: { source: 'TCT' } };
    return {
        calls,
        entries,
        clients,
        service: {
            async preflight(source) {
                calls.push(`preflight:${source}`);
                return { status: 'SESSION_VALID', source };
            },
            withSourceLock(source, operation) {
                calls.push(`lock:${source}`);
                return operation();
            },
            getRegistryState(source) { return entries[source]; },
            getInteractiveClient(source) {
                calls.push(`session:${source}`);
                return clients[source];
            },
        },
    };
}

function createQueueRegistry(statuses) {
    const filenameDateRule = createFilenameDateRule({ id: 'F13_TEST_DATE', prefix: 'F1.3', parse: () => '2026-01-01' });
    function lane(sourceLane) {
        const identity = F13_EXECUTOR_IDENTITIES[sourceLane];
        return {
            code: sourceLane,
            priority: sourceLane === 'HUE' ? 10 : 20,
            parser: () => ({ parsedData: [] }),
            targetTable: sourceLane === 'HUE' ? 'fact_f13' : 'fact_f13_national',
            completionPolicy: {
                id: `F13_${sourceLane}_TEST_COMPLETION`,
                async evaluate({ businessDate }) {
                    const key = `F1.3|${sourceLane}|${businessDate}`;
                    return { status: statuses.get(key) || 'MISSING', evidence: { key } };
                },
            },
            automationMode: 'AUTOMATED',
            manualOnlyReason: null,
            portalAdapter: { ...identity, verified: true },
            permissions: DEFAULT_PERMISSIONS,
            retryPolicy: DEFAULT_RETRY_POLICY,
            circuitScope: CIRCUIT_SCOPE,
        };
    }
    return [{
        code: 'F1.3',
        key: 'F1.3',
        name: 'F1.3 queue adapter test',
        status: 'ACTIVE',
        priority: 10,
        trackingStartDate: '2026-01-01',
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: 'F1.3',
        filenamePattern: /^F1\.3-.*\.xlsx$/,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir: path.join(os.tmpdir(), 'unused-f13-adapter-artifacts'),
        lanes: { HUE: lane('HUE'), TCT: lane('TCT') },
    }];
}

function makeQueueService({ dbPath, statuses, executorRegistry, workerId }) {
    const registry = createQueueRegistry(statuses);
    return new AutoBackfillQueueService({
        store: new AutoBackfillQueueStore({ dbPath, leaseMs: 1000 }),
        coverageService: new AutoBackfillCoverageService({
            db: {},
            clock: () => new Date('2026-01-01T18:00:00.000Z'),
            registryProvider: () => registry,
            registryVersion: 'F13-EXECUTOR-TEST-1',
        }),
        executorRegistry,
        registryProvider: () => registry,
        registryVersion: 'F13-EXECUTOR-TEST-1',
        completionDb: {},
        fsImpl: { existsSync: () => false },
        workerId,
        heartbeatMs: 100000,
    });
}

test('F1.3 HUE and TCT executors preserve exact identity, session, lock, and one-date adapter calls', async () => {
    const session = createSessionHarness();
    const calls = [];
    const hueSyncService = {
        async start(date, options) {
            calls.push({ source: 'HUE', date, options });
            return { status: 'SUCCESS', run: { runId: 'hue-run', status: 'SUCCESS' } };
        },
        getRun() { return null; },
    };
    const hueAdapter = new HueF13Adapter({ syncService: hueSyncService, sessionPreflightService: session.service });
    const tctAdapter = new TctF13Adapter({
        async runOneDateImport(date, jobId, options) {
            calls.push({ source: 'TCT', date, jobId, options });
            return { status: 'SUCCESS' };
        },
    });
    const executors = createF13AutoBackfillExecutors({
        db: {}, sessionPreflightService: session.service, hueSyncService, hueAdapter, tctAdapter, pollIntervalMs: 1,
        tctBackfillService: {},
    });

    await executors.HUE.execute({ indicator: 'F1.3', sourceLane: 'HUE', businessDate: '2026-01-07', jobId: 'job-hue' });
    await executors.TCT.execute({ indicator: 'F1.3', sourceLane: 'TCT', businessDate: '2026-01-06', jobId: 'job-tct' });

    assert.deepEqual(calls.map((call) => [call.source, call.date]), [['HUE', '2026-01-07'], ['TCT', '2026-01-06']]);
    assert.equal(calls[0].options.requireExistingSession, true);
    assert.equal(calls[0].options.forceReimport, false);
    assert.equal(calls[0].options.portalClient, session.clients.HUE);
    assert.equal(calls[1].jobId, 'job-tct');
    assert.equal(calls[1].options.refreshRequested, false);
    assert.equal(calls[1].options.portalClient, session.clients.TCT);
    assert.deepEqual(session.calls, [
        'preflight:HUE', 'lock:HUE', 'session:HUE',
        'preflight:TCT', 'lock:TCT', 'session:TCT',
    ]);
    assert.equal(session.entries.HUE.activeOperation, null);
    assert.equal(session.entries.TCT.activeOperation, null);
    assert.match(F13_EXECUTOR_IDENTITIES.HUE.resourceIdentity, /chi_tiet$/);
    assert.equal(F13_EXECUTOR_IDENTITIES.TCT.resourceIdentity, 'F1.3_chat_luong_phat_buu_giay_lien_tinh');
});

test('authentication-required is propagated and coordinator does not attempt later work', async () => {
    const session = createSessionHarness();
    session.service.preflight = async () => ({
        status: 'AUTHENTICATION_REQUIRED',
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Manual login required.' },
    });
    const executor = createF13AutoBackfillExecutors({
        db: {}, sessionPreflightService: session.service, hueSyncService: {}, tctBackfillService: {},
        hueAdapter: { async runOneDate() { assert.fail('adapter must not run without authentication'); } },
        tctAdapter: { async runOneDate() { assert.fail('adapter must not run without authentication'); } },
    }).HUE;
    await assert.rejects(
        executor.execute({ indicator: 'F1.3', sourceLane: 'HUE', businessDate: '2026-01-01', jobId: 'auth-job' }),
        (error) => error.code === 'AUTHENTICATION_REQUIRED' && /Manual login required/.test(error.message)
    );

    let processCalls = 0;
    const queueService = {
        store: { async getCoordinatorState() { return { eligibleJobCount: 2, runningJobCount: 0, leaseExpiresAt: null }; } },
        async processNext() {
            processCalls += 1;
            const error = new Error('Manual login required.');
            error.code = 'AUTHENTICATION_REQUIRED';
            throw error;
        },
    };
    const coordinator = new AutoBackfillWorkerCoordinator({
        queueService,
        minPollMs: 5,
        maxPollMs: 10,
        onError() {},
    });
    coordinator.start();
    await eventually(() => processCalls === 1 && !coordinator.snapshot().draining);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(processCalls, 1);
    assert.equal(coordinator.snapshot().timerScheduled, false);
    await coordinator.stop();
});

test('runtime registration is complete before queue/coordinator construction', () => {
    const order = [];
    const runtime = buildRuntime({
        runtimeDbPath: path.join(os.tmpdir(), `f13-runtime-order-${Date.now()}.sqlite`),
        completionDb: {},
        registerExecutors(registry) {
            order.push('register');
            registry.register('ORDER_TEST', { async execute() {} }, { verified: true });
        },
        coordinatorFactory({ queueService }) {
            order.push(queueService.executorRegistry.getVerified('ORDER_TEST') ? 'coordinator-after-registration' : 'coordinator-before-registration');
            return { wake() {}, start() {}, async stop() {} };
        },
    });
    assert.deepEqual(order, ['register', 'coordinator-after-registration']);
    assert.ok(runtime.executorRegistry.getVerified('ORDER_TEST'));
});

test('production runtime builder installs both verified F1.3 executors without starting work', () => {
    const runtime = buildRuntime({
        runtimeDbPath: path.join(os.tmpdir(), `f13-runtime-registration-${Date.now()}.sqlite`),
        completionDb: { async all() { return []; }, async get() { return null; } },
    });
    assert.ok(runtime.executorRegistry.getVerified(F13_EXECUTOR_IDENTITIES.HUE.id));
    assert.ok(runtime.executorRegistry.getVerified(F13_EXECUTOR_IDENTITIES.TCT.id));
    assert.equal(runtime.coordinator.snapshot().started, false);
    assert.equal(runtime.coordinator.snapshot().processNextCount, 0);
});

test('persisted F1.3 work is executable after restart and the global lease prevents HUE/TCT overlap', async () => {
    const dbPath = path.join(os.tmpdir(), `f13-executor-queue-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyAutoBackfillQueueSchema(dbPath);
    const statuses = new Map();
    const session = createSessionHarness();
    const started = deferred();
    const release = deferred();
    let concurrent = 0;
    let maximumConcurrent = 0;
    const calls = [];
    const adapters = {
        HUE: {
            async runOneDate(date) {
                calls.push(`HUE:${date}`);
                concurrent += 1;
                maximumConcurrent = Math.max(maximumConcurrent, concurrent);
                started.resolve();
                await release.promise;
                statuses.set(`F1.3|HUE|${date}`, 'SUCCESS');
                concurrent -= 1;
                return { status: 'SUCCESS', run: { status: 'SUCCESS' } };
            },
        },
        TCT: {
            async runOneDate(date) {
                calls.push(`TCT:${date}`);
                concurrent += 1;
                maximumConcurrent = Math.max(maximumConcurrent, concurrent);
                statuses.set(`F1.3|TCT|${date}`, 'SUCCESS');
                concurrent -= 1;
                return { status: 'SUCCESS' };
            },
        },
    };

    function registryWithExecutors() {
        const registry = new AutoBackfillExecutorRegistry();
        registerF13AutoBackfillExecutors(registry, {
            db: {},
            sessionPreflightService: session.service,
            hueSyncService: {},
            tctBackfillService: {},
            hueAdapter: adapters.HUE,
            tctAdapter: adapters.TCT,
            pollIntervalMs: 1,
        });
        return registry;
    }

    try {
        const creator = makeQueueService({ dbPath, statuses, executorRegistry: registryWithExecutors(), workerId: 'before-restart' });
        const created = await creator.createRun({ actor: 'admin', roles: ['admin'] });
        assert.equal(created.jobs.length, 2);

        const restartedA = makeQueueService({ dbPath, statuses, executorRegistry: registryWithExecutors(), workerId: 'restart-a' });
        const restartedB = makeQueueService({ dbPath, statuses, executorRegistry: registryWithExecutors(), workerId: 'restart-b' });
        const first = restartedA.processNext();
        await started.promise;
        assert.equal(await restartedB.processNext(), null);
        assert.equal(calls.length, 1);
        release.resolve();
        await first;
        await restartedB.processNext();
        assert.deepEqual(calls, ['HUE:2026-01-01', 'TCT:2026-01-01']);
        assert.equal(maximumConcurrent, 1);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('external SUCCESS before lease skips the F1.3 executor', async () => {
    const dbPath = path.join(os.tmpdir(), `f13-success-skip-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    await applyAutoBackfillQueueSchema(dbPath);
    const statuses = new Map([['F1.3|TCT|2026-01-01', 'SUCCESS']]);
    let calls = 0;
    const session = createSessionHarness();
    const registry = new AutoBackfillExecutorRegistry();
    registerF13AutoBackfillExecutors(registry, {
        db: {}, sessionPreflightService: session.service, hueSyncService: {}, tctBackfillService: {},
        hueAdapter: { async runOneDate(date) { calls += 1; statuses.set(`F1.3|HUE|${date}`, 'SUCCESS'); return { status: 'SUCCESS', run: { status: 'SUCCESS' } }; } },
        tctAdapter: { async runOneDate() { calls += 1; } },
        pollIntervalMs: 1,
    });
    try {
        const service = makeQueueService({ dbPath, statuses, executorRegistry: registry, workerId: 'success-skip' });
        const created = await service.createRun({ actor: 'admin', roles: ['admin'], sourceLane: 'HUE' });
        statuses.set('F1.3|HUE|2026-01-01', 'SUCCESS');
        assert.equal((await service.processNext()).state, 'SKIPPED_ALREADY_SUCCESS');
        assert.equal(calls, 0);
        assert.equal(created.jobs.length, 1);
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('F4.1 remains manual-only and exposes no executable Portal adapter', () => {
    for (const lane of Object.values(INDICATORS['F4.1'].lanes)) {
        assert.equal(lane.automationMode, 'MANUAL_ONLY');
        assert.equal(lane.portalAdapter, null);
        assert.equal(lane.manualOnlyReason, 'PORTAL_ADAPTER_NOT_VERIFIED');
    }
});

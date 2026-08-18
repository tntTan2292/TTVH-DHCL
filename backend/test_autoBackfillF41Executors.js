'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f41-hue-adapter-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F41 = path.join(sandbox, 'F4.1');

const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyF41Phase1Schema } = require('./migrate_f41_phase1_schema');
const { applyF41Phase2Schema } = require('./migrate_f41_phase2_schema');
const { all, db, get } = require('./src/config/db');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const {
    F41_EXECUTOR_IDENTITIES,
    createF41AutoBackfillExecutors,
} = require('./src/services/autoBackfillF41Executors');
const { F41HueSingleDateService } = require('./src/services/f41HueSingleDateService');
const { F41_HUE_COLUMN_MAPPING } = require('./src/services/f41HueExcelParser');
const { buildRuntime } = require('./src/services/autoBackfillQueueRuntime');
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

test.after(async () => {
    await new Promise((resolve) => db.close(() => resolve()));
    fs.rmSync(sandbox, { recursive: true, force: true });
});

function createSessionHarness({ status = 'SESSION_VALID' } = {}) {
    const calls = [];
    const entry = { activeOperation: null };
    const portalClient = { source: 'HUE' };
    return {
        calls,
        entry,
        portalClient,
        service: {
            async preflight(source) {
                calls.push(`preflight:${source}`);
                return status === 'SESSION_VALID'
                    ? { status, source }
                    : { status, error: { message: 'Manual HUE login required.' } };
            },
            withSourceLock(source, operation) {
                calls.push(`lock:${source}`);
                return operation();
            },
            getRegistryState() { return entry; },
            getInteractiveClient(source) {
                calls.push(`session:${source}`);
                return portalClient;
            },
        },
    };
}

function writeHueWorkbook(filePath) {
    const headers = Object.keys(F41_HUE_COLUMN_MAPPING);
    const rows = [
        { id: 'F41-HUE-001', assessment: 'Đạt' },
        { id: 'F41-HUE-002', assessment: 'Không đạt' },
    ].map((fixture, index) => headers.map((header) => {
        if (header === 'STT') return index + 1;
        if (header === 'Số hiệu bưu gửi') return fixture.id;
        if (header === 'Mã BC phát') return '533140';
        if (header === 'Tên BC phát') return 'BCVH Thuận Hóa';
        if (header === 'Đánh giá (thời gian Có TMS PTC 8 giờ)') return fixture.assessment;
        return null;
    }));
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Worksheet');
    xlsx.writeFile(workbook, filePath);
}

test('F4.1 HUE executor preserves exact identity, manual session, source lock, and one-date call', async () => {
    const session = createSessionHarness();
    const calls = [];
    const executor = createF41AutoBackfillExecutors({
        sessionPreflightService: session.service,
        hueAdapter: {
            async runOneDate(date, options) {
                calls.push({ date, options });
                assert.equal(session.entry.activeOperation, 'AUTO_BACKFILL_F41_HUE');
                return { status: 'SUCCESS' };
            },
        },
    }).HUE;

    await executor.execute({ indicator: 'F4.1', sourceLane: 'HUE', businessDate: '2026-08-01', jobId: 'f41-hue-job' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].date, '2026-08-01');
    assert.equal(calls[0].options.jobId, 'f41-hue-job');
    assert.equal(calls[0].options.refreshRequested, false);
    assert.equal(calls[0].options.portalClient, session.portalClient);
    assert.deepEqual(session.calls, ['preflight:HUE', 'lock:HUE', 'session:HUE']);
    assert.equal(session.entry.activeOperation, null);
    await assert.rejects(
        executor.execute({ indicator: 'F4.1', sourceLane: 'TCT', businessDate: '2026-08-01' }),
        (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH'
    );
});

test('F4.1 HUE executor propagates AUTHENTICATION_REQUIRED before adapter work', async () => {
    const session = createSessionHarness({ status: 'AUTHENTICATION_REQUIRED' });
    const executor = createF41AutoBackfillExecutors({
        sessionPreflightService: session.service,
        hueAdapter: { async runOneDate() { assert.fail('adapter must not run'); } },
    }).HUE;
    await assert.rejects(
        executor.execute({ indicator: 'F4.1', sourceLane: 'HUE', businessDate: '2026-08-01' }),
        (error) => error.code === 'AUTHENTICATION_REQUIRED' && /Manual HUE login required/.test(error.message)
    );
    assert.deepEqual(session.calls, ['preflight:HUE']);
});

test('F4.1 HUE fake export uses verified identity, existing Import pipeline, and exact completion evidence', async () => {
    await applyF41Phase1Schema(process.env.QIS_TEST_DB_PATH);
    await applyF41Phase2Schema(process.env.QIS_TEST_DB_PATH);
    const calls = [];
    const generatedFile = {
        filename: `${F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity}_20260801.xlsx`,
        href: '/files-xlsx/f41-hue-test',
    };
    const portalClient = {
        async openF41Report() { calls.push('open'); },
        async submitF41HueFilters(options) { calls.push(['filters', options]); },
        async readF41HueOuterSummary() {
            calls.push('summary');
            return { unitCount: 9, totalVolume: 2, passedVolume: 1, rate: '50%', exportIdentity: F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity };
        },
        async requestF41HueExport() { calls.push('export'); },
        async pollGeneratedFile(options) {
            calls.push(['poll', options.match]);
            return generatedFile;
        },
        async downloadXlsx({ file, targetDir }) {
            calls.push(['download', file.filename]);
            fs.mkdirSync(targetDir, { recursive: true });
            const filePath = path.join(targetDir, file.filename);
            writeHueWorkbook(filePath);
            return filePath;
        },
        async deleteGeneratedFile(file) {
            calls.push(['cleanup', file.filename]);
            return { status: 'SUCCESS' };
        },
    };
    const service = new F41HueSingleDateService({
        rawDownloadDir: path.join(sandbox, 'raw'),
        downloadStableTimeoutMs: 2000,
        generationTimeoutMs: 1000,
        generationPollingIntervalMs: 10,
    });

    const result = await service.runOneDate('2026-08-01', { portalClient, refreshRequested: false });
    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.total, 2);
    assert.equal(result.passed, 1);
    assert.equal(result.rate, 50);
    assert.equal(result.standardizedFilename, 'F4.1-2026.08.01.xlsx');
    assert.deepEqual(calls.slice(0, 5), [
        'open',
        ['filters', { businessDate: '2026-08-01' }],
        'summary',
        'export',
        ['poll', F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity],
    ]);
    assert.equal(calls.some((call) => Array.isArray(call) && call[0] === 'cleanup'), true);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f41 WHERE ngay_do_kiem = '2026-08-01'")).n, 2);
    assert.equal((await get("SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'F4.1' AND source_lane = 'HUE' AND status = 'SUCCESS'")).n, 1);
    assert.equal(fs.existsSync(path.join(process.env.QIS_TEST_DATA_ROOT_F41, 'Processed', 'HUE', 'F4.1-2026.08.01.xlsx')), true);
    const completion = await INDICATORS['F4.1'].lanes.HUE.completionPolicy.evaluate({
        db: { all, get },
        fs,
        indicator: { ...INDICATORS['F4.1'], processedDir: path.join(process.env.QIS_TEST_DATA_ROOT_F41, 'Processed') },
        lane: INDICATORS['F4.1'].lanes.HUE,
        businessDate: '2026-08-01',
    });
    assert.equal(completion.status, 'SUCCESS');

    await assert.rejects(
        service.runOneDate('2026-08-02', { portalClient, refreshRequested: true }),
        (error) => error.code === 'F41_HUE_FORCE_REIMPORT_FORBIDDEN'
    );
});

test('F4.1 HUE queued work externally completed before lease skips executor', async () => {
    const queueDbPath = path.join(sandbox, 'queue-skip.sqlite');
    await applyAutoBackfillQueueSchema(queueDbPath);
    const statuses = new Map();
    let executions = 0;
    const filenameDateRule = createFilenameDateRule({ id: 'F41_HUE_TEST_DATE', prefix: 'F4.1', parse: () => '2026-01-01' });
    const lane = {
        code: 'HUE',
        priority: 10,
        parser: () => ({ parsedData: [] }),
        targetTable: 'fact_f41',
        completionPolicy: {
            id: 'F41_HUE_TEST_COMPLETION',
            async evaluate({ businessDate }) {
                return { status: statuses.get(businessDate) || 'MISSING', evidence: { businessDate } };
            },
        },
        automationMode: 'AUTOMATED',
        portalAdapter: { ...F41_EXECUTOR_IDENTITIES.HUE, verified: true },
        permissions: DEFAULT_PERMISSIONS,
        retryPolicy: DEFAULT_RETRY_POLICY,
        circuitScope: CIRCUIT_SCOPE,
    };
    const indicator = {
        code: 'F4.1', key: 'F4.1', name: 'F4.1 HUE queue test', status: 'ACTIVE', priority: 20,
        trackingStartDate: '2026-01-01', businessTimezone: 'Asia/Ho_Chi_Minh', folder: 'F4.1',
        filenamePattern: /^F4\.1-.*\.xlsx$/, filenameDateRule, extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format, processedDir: path.join(sandbox, 'unused'), lanes: { HUE: lane },
    };
    const executorRegistry = new AutoBackfillExecutorRegistry();
    executorRegistry.register(F41_EXECUTOR_IDENTITIES.HUE.id, { async execute() { executions += 1; } }, { verified: true });
    const registryProvider = () => [indicator];
    const service = new AutoBackfillQueueService({
        store: new AutoBackfillQueueStore({ dbPath: queueDbPath }),
        coverageService: new AutoBackfillCoverageService({
            db: {},
            clock: () => new Date('2026-01-01T18:00:00.000Z'),
            registryProvider,
            registryVersion: 'F41-HUE-SKIP-1',
        }),
        completionDb: {}, executorRegistry, registryProvider, registryVersion: 'F41-HUE-SKIP-1',
        fsImpl: { existsSync: () => false },
    });
    const created = await service.createRun({ actor: 'admin', roles: ['admin'] });
    assert.equal(created.jobs.length, 1);
    statuses.set('2026-01-01', 'SUCCESS');
    assert.equal((await service.processNext()).state, 'SKIPPED_ALREADY_SUCCESS');
    assert.equal(executions, 0);
});

test('runtime registers F4.1 HUE before coordinator and leaves TCT manual-only', () => {
    const runtime = buildRuntime({
        runtimeDbPath: path.join(sandbox, 'runtime.sqlite'),
        completionDb: { async all() { return []; }, async get() { return null; } },
    });
    assert.ok(runtime.executorRegistry.getVerified(F41_EXECUTOR_IDENTITIES.HUE.id));
    assert.equal(runtime.coordinator.snapshot().started, false);
    assert.equal(INDICATORS['F4.1'].lanes.HUE.automationMode, 'AUTOMATED');
    assert.equal(INDICATORS['F4.1'].lanes.TCT.automationMode, 'MANUAL_ONLY');
    assert.equal(INDICATORS['F4.1'].lanes.TCT.portalAdapter, null);
});

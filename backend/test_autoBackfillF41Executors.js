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
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyF41Phase1Schema } = require('./migrate_f41_phase1_schema');
const { applyF41Phase2Schema } = require('./migrate_f41_phase2_schema');
const { all, db, get } = require('./src/config/db');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillExecutorRegistry } = require('./src/services/autoBackfillExecutorRegistry');
const { AutoBackfillQueueService } = require('./src/services/autoBackfillQueueService');
const { AutoBackfillQueueStore } = require('./src/services/autoBackfillQueueStore');
const {
    F41_EXECUTOR_IDENTITIES,
    F41AutoBackfillExecutor,
    createF41AutoBackfillExecutors,
    registerF41AutoBackfillExecutors,
} = require('./src/services/autoBackfillF41Executors');
const { REQUIRED_HUE_BCVH_CODES, REQUIRED_TCT_PROVINCE_CODES } = require('./src/services/f41RequiredUnits');
const { F41HueSingleDateService } = require('./src/services/f41HueSingleDateService');
const { F41TctSingleDateService } = require('./src/services/f41TctSingleDateService');
const { F41_HUE_COLUMN_MAPPING } = require('./src/services/f41HueExcelParser');
const { F41_TCT_DB_COLUMNS, F41_TCT_RATE_COLUMNS } = require('./src/services/f41TctExcelParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./src/services/nationalExcelParser');
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

function createSessionHarness({ status = 'SESSION_VALID', source = 'HUE' } = {}) {
    const calls = [];
    const entry = { activeOperation: null };
    const portalClient = { source };
    return {
        calls,
        entry,
        portalClient,
        service: {
            async preflight(source) {
                calls.push(`preflight:${source}`);
                return status === 'SESSION_VALID'
                    ? { status, source }
                    : { status, error: { message: `Manual ${source} login required.` } };
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

const TCT_EXCLUDED_CODES = ['01', '08', '11', '12', '14', '15', '34', '49', '71', '75', '77', '82'];
const TCT_COUNT_INDEXES = [10, 11, 13, 15, 17, 19, 21, 22, 23, 25, 27, 29, 30, 31, 32, 33, 34, 36];

function assignCells(row, cells) {
    for (const [index, value] of cells) row[index] = value;
}

function writeTctWorkbook(filePath) {
    const header = Array(38).fill(null);
    assignCells(header, [
        [0, 'TT'], [1, 'Mã tỉnh'], [2, 'Tên tỉnh'], [3, 'Mã huyện'], [4, 'Tên huyện'],
        [5, 'Mã BC'], [6, 'Tên BC'], [7, 'Loại BC'], [8, 'Ma KHL'], [9, 'Ten KHL'],
        [10, 'Sản lượng PTC/ Nộp tiền/ CH'], [11, 'Sản lượng PTC/ Nộp tiền'], [12, 'Tỷ lệ PTC/ Nộp tiền'],
        [13, 'Đúng thời gian quy định'], [17, 'Quá thời gian quy định'],
        [21, 'Sản lượng chưa đủ thông tin đo kiểm'], [22, 'SL loại trừ không đo kiểm'],
        [23, 'SL Chuyển hoàn'], [24, 'Tỷ lệ chuyển hoàn'],
        [25, 'Sản lượng bưu gửi PTC 8 giờ tại bưu cục (XNĐ BD1)'],
        [26, 'Tỷ lệ gửi PTC 8 giờ tại bưu cục ( XNĐ BD1)'],
        [27, 'Sản lượng bưu gửi PTC 8 giờ tại bưu cục (có quét TMS)'],
        [28, 'Tỷ lệ gửi PTC 8 giờ tại bưu cục (có quét TMS)'],
        [34, 'Sản lượng bưu gửi PTC 8 giờ lần đầu tại bưu cục (XNĐ BD1)'],
        [35, 'Tỷ lệ gửi PTC 8 giờ lần đầu tại bưu cục (XNĐ BD1)'],
        [36, 'Sản lượng bưu gửi PTC 8 giờ lần đầu tại bưu cục (có quét TMS)'],
        [37, 'Tỷ lệ gửi PTC 8 giờ lần đầu tại bưu cục (có quét TMS)'],
    ]);
    const subHeader = Array(38).fill(null);
    assignCells(subHeader, [
        [13, 'Sản lượng PTC trong thời gian QĐ 12,5 giờ'], [14, 'Tỷ PTC trong thời gian QĐ 12,5 giờ'],
        [15, 'Sản lượng bưu gửi PTC/Nộp tiền/Chuyển hoàn trong thời gian QĐ giờ 72 giờ'],
        [16, 'Tỷ lệ bưu gửi PTC/Nộp tiền/Chuyển hoàn trong thời gian QĐ giờ/72 giờ'],
        [17, 'Sản lượng phát thành công /Nộp tiền>12,5 giờ và chuyển hoàn'],
        [18, 'Tỷ lệ phát thành công /Nộp tiền>12,5 giờ và chuyển hoàn'],
        [19, 'Sản lượng phát thành công /Nộp tiền/Chuyển hoàn > 72 giờ'],
        [20, 'Tỷ lệ phát thành công /Nộp tiền/Chuyển hoàn > 72 giờ'],
    ]);
    const legend = Array(38).fill(null);
    assignCells(legend, [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
        [12, '11=10/9'], [13, 12], [14, 13], [15, 14], [16, '15=14/9'], [17, 16],
        [18, '17=16/9'], [19, 18], [20, '19=18/9'], [21, 20], [22, 21], [23, 22],
        [24, '22/9=23'], [25, 24], [26, '24/9=25'], [27, 26], [28, '27=26/9'],
        [29, 28], [30, 29], [31, 30], [32, 31], [34, 32], [35, '33=32/9'], [36, 34], [37, '35=34/9'],
    ]);
    const rateIndexes = F41_TCT_RATE_COLUMNS.map((column) => F41_TCT_DB_COLUMNS.indexOf(column));
    const unitCodes = [...NATIONAL_RANKED_PROVINCE_CODES, ...TCT_EXCLUDED_CODES];
    const units = unitCodes.map((code, index) => {
        const row = Array(38).fill(null);
        row[0] = index + 2;
        row[1] = code;
        row[2] = code === '53' ? 'Bưu điện Thành phố Huế' : `Unit ${code}`;
        for (const countIndex of TCT_COUNT_INDEXES) row[countIndex] = 0;
        for (const rateIndex of rateIndexes) row[rateIndex] = '0.00%';
        if (code === '53') {
            row[10] = 4684;
            row[27] = 2863;
            row[28] = '61.12%';
        }
        return row;
    });
    const grandTotal = Array(38).fill(null);
    grandTotal[0] = 1;
    for (const countIndex of TCT_COUNT_INDEXES) {
        grandTotal[countIndex] = units.reduce((sum, row) => sum + Number(row[countIndex] || 0), 0);
    }
    for (const rateIndex of rateIndexes) grandTotal[rateIndex] = '0.00%';

    const worksheet = xlsx.utils.aoa_to_sheet([header, subHeader, legend, grandTotal, ...units]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Worksheet');
    xlsx.writeFile(workbook, filePath);
}

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

function createF41QueueRegistry(statuses) {
    const filenameDateRule = createFilenameDateRule({ id: 'F41_TEST_DATE', prefix: 'F4.1', parse: () => '2026-01-01' });
    function lane(sourceLane) {
        const identity = F41_EXECUTOR_IDENTITIES[sourceLane];
        return {
            code: sourceLane,
            priority: sourceLane === 'HUE' ? 10 : 20,
            parser: () => ({ parsedData: [] }),
            targetTable: sourceLane === 'HUE' ? 'fact_f41' : 'fact_f41_national',
            completionPolicy: {
                id: `F41_${sourceLane}_TEST_COMPLETION`,
                async evaluate({ businessDate }) {
                    const key = `F4.1|${sourceLane}|${businessDate}`;
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
        code: 'F4.1', key: 'F4.1', name: 'F4.1 queue adapter test', status: 'ACTIVE', priority: 20,
        trackingStartDate: '2026-01-01', businessTimezone: 'Asia/Ho_Chi_Minh', folder: 'F4.1',
        filenamePattern: /^F4\.1-.*\.xlsx$/, filenameDateRule, extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format, processedDir: path.join(sandbox, 'unused-f41-artifacts'),
        lanes: { HUE: lane('HUE'), TCT: lane('TCT') },
    }];
}

function makeF41QueueService({ dbPath, statuses, executorRegistry, workerId }) {
    const registry = createF41QueueRegistry(statuses);
    return new AutoBackfillQueueService({
        store: new AutoBackfillQueueStore({ dbPath, leaseMs: 1000 }),
        coverageService: new AutoBackfillCoverageService({
            db: {},
            clock: () => new Date('2026-01-01T18:00:00.000Z'),
            registryProvider: () => registry,
            registryVersion: 'F41-EXECUTOR-TEST-1',
        }),
        completionDb: {}, executorRegistry, registryProvider: () => registry,
        registryVersion: 'F41-EXECUTOR-TEST-1', fsImpl: { existsSync: () => false },
        workerId, heartbeatMs: 100000,
    });
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

test('F4.1 TCT executor preserves exact identity, manual session, source lock, and one-date call', async () => {
    const session = createSessionHarness({ source: 'TCT' });
    const calls = [];
    const executor = createF41AutoBackfillExecutors({
        sessionPreflightService: session.service,
        tctAdapter: {
            async runOneDate(date, options) {
                calls.push({ date, options });
                assert.equal(session.entry.activeOperation, 'AUTO_BACKFILL_F41_TCT');
                return { status: 'SUCCESS' };
            },
        },
    }).TCT;

    await executor.execute({ indicator: 'F4.1', sourceLane: 'TCT', businessDate: '2026-08-01', jobId: 'f41-tct-job' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].date, '2026-08-01');
    assert.equal(calls[0].options.jobId, 'f41-tct-job');
    assert.equal(calls[0].options.refreshRequested, false);
    assert.equal(calls[0].options.portalClient, session.portalClient);
    assert.deepEqual(session.calls, ['preflight:TCT', 'lock:TCT', 'session:TCT']);
    assert.equal(session.entry.activeOperation, null);
    await assert.rejects(
        executor.execute({ indicator: 'F4.1', sourceLane: 'HUE', businessDate: '2026-08-01' }),
        (error) => error.code === 'AUTO_BACKFILL_EXECUTOR_IDENTITY_MISMATCH'
    );
});

test('F4.1 TCT executor propagates AUTHENTICATION_REQUIRED before adapter work', async () => {
    const session = createSessionHarness({ status: 'AUTHENTICATION_REQUIRED', source: 'TCT' });
    const executor = createF41AutoBackfillExecutors({
        sessionPreflightService: session.service,
        tctAdapter: { async runOneDate() { assert.fail('adapter must not run'); } },
    }).TCT;
    await assert.rejects(
        executor.execute({ indicator: 'F4.1', sourceLane: 'TCT', businessDate: '2026-08-01' }),
        (error) => error.code === 'AUTHENTICATION_REQUIRED' && /Manual TCT login required/.test(error.message)
    );
    assert.deepEqual(session.calls, ['preflight:TCT']);
});

test('F4.1 HUE fake export uses verified identity, existing Import pipeline, and exact completion evidence', async () => {
    await applyF41Phase1Schema(process.env.QIS_TEST_DB_PATH);
    await applyF41Phase2Schema(process.env.QIS_TEST_DB_PATH);
    const calls = [];
    const generatedFile = {
        // AB-AUTH-17: the portal names generated files after the REPORT, not after the stored
        // procedure, so the fixture filename now mirrors what the portal really produces -- and it
        // must be the DETAIL report, since that is the only F4.1 HUE export carrying the 42-column
        // per-item schema the parser requires.
        filename: `fixture_${F41_EXECUTOR_IDENTITIES.HUE.generatedFileMatch}_20260801.xlsx`,
        href: '/files-xlsx/f41-hue-test',
    };
    const portalClient = {
        async openF41Report() { calls.push('open'); },
        async submitF41HueFilters(options) { calls.push(['filters', options]); },
        async readF41HueOuterSummary() {
            calls.push('summary');
            // AB-AUTH-16: completeness is the canonical BCVH set, not a row total. The row count
            // here is deliberately NOT 9 -- a real day frequently reports fewer rows.
            return { unitCount: 8, unitCodes: [...REQUIRED_HUE_BCVH_CODES], totalVolume: 2, passedVolume: 1, rate: '50%', exportIdentity: F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity };
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
        // AB-AUTH-17: was resourceIdentity ('sp_Phat_ChatLuong_PTC_BuuCuc_V2'), a stored-procedure
        // name that can never appear in a generated filename -- so this lane's poll could never have
        // matched its workbook.
        ['poll', F41_EXECUTOR_IDENTITIES.HUE.generatedFileMatch],
    ]);
    assert.equal(F41_EXECUTOR_IDENTITIES.HUE.generatedFileMatch.startsWith('sp_'), false);
    assert.equal(F41_EXECUTOR_IDENTITIES.HUE.generatedFileMatch.endsWith('_chi_tiet'), true);
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

test('F4.1 TCT fake export preserves 46/34 population, raw percentages, and exact completion evidence', async () => {
    await applyF41Phase1Schema(process.env.QIS_TEST_DB_PATH);
    await applyF41Phase2Schema(process.env.QIS_TEST_DB_PATH);
    const calls = [];
    const generatedFile = {
        filename: `fixture_${F41_EXECUTOR_IDENTITIES.TCT.generatedFileMatch}.xlsx`,
        href: '/files-xlsx/f41-tct-test',
    };
    const portalClient = {
        async openF41Report() { calls.push('open'); },
        async submitF41TctFilters(options) { calls.push(['filters', options]); },
        async readF41TctOuterSummary() {
            calls.push('summary');
            // AB-AUTH-16: as above -- 38 rows, all 34 ranked provinces present, which is what counts.
            return { outerRowCount: 38, provinceCodes: [...REQUIRED_TCT_PROVINCE_CODES], exportIdentity: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity };
        },
        async requestF41TctExport() { calls.push('export'); },
        async pollGeneratedFile(options) {
            calls.push(['poll', options.match]);
            return generatedFile;
        },
        async downloadXlsx({ file, targetDir }) {
            calls.push(['download', file.filename]);
            fs.mkdirSync(targetDir, { recursive: true });
            const filePath = path.join(targetDir, file.filename);
            writeTctWorkbook(filePath);
            return filePath;
        },
        async deleteGeneratedFile(file) {
            calls.push(['cleanup', file.filename]);
            return { status: 'SUCCESS' };
        },
    };
    const service = new F41TctSingleDateService({
        rawDownloadDir: path.join(sandbox, 'tct-raw'),
        downloadStableTimeoutMs: 2000,
        generationTimeoutMs: 1000,
        generationPollingIntervalMs: 10,
    });

    const result = await service.runOneDate('2026-08-01', { portalClient, refreshRequested: false });
    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.rawReportingRows, 46);
    assert.equal(result.acceptedRows, 34);
    assert.equal(result.excludedRowsCount, 12);
    assert.deepEqual(calls.slice(0, 5), [
        'open',
        ['filters', { businessDate: '2026-08-01' }],
        'summary',
        'export',
        ['poll', F41_EXECUTOR_IDENTITIES.TCT.generatedFileMatch],
    ]);
    assert.equal(calls.some((call) => Array.isArray(call) && call[0] === 'cleanup'), true);
    assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f41_national WHERE ngay_do_kiem = '2026-08-01'")).n, 34);
    const hue = await get("SELECT sl_ptc_8h_co_tms AS passed, sl_ptc_nop_tien_ch AS total, tl_ptc_8h_co_tms AS rate FROM fact_f41_national WHERE ngay_do_kiem = '2026-08-01' AND ma_don_vi = '53'");
    assert.deepEqual(hue, { passed: 2863, total: 4684, rate: '61.12%' });
    assert.equal((await get("SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'F4.1' AND source_lane = 'TCT' AND status = 'SUCCESS'")).n, 1);
    assert.equal(fs.existsSync(path.join(process.env.QIS_TEST_DATA_ROOT_F41, 'Processed', 'TCT', 'F4.1-2026.08.01.xlsx')), true);
    const completion = await INDICATORS['F4.1'].lanes.TCT.completionPolicy.evaluate({
        db: { all, get },
        fs,
        indicator: { ...INDICATORS['F4.1'], processedDir: path.join(process.env.QIS_TEST_DATA_ROOT_F41, 'Processed') },
        lane: INDICATORS['F4.1'].lanes.TCT,
        businessDate: '2026-08-01',
    });
    assert.equal(completion.status, 'SUCCESS');

    await assert.rejects(
        service.runOneDate('2026-08-02', { portalClient, refreshRequested: true }),
        (error) => error.code === 'F41_TCT_FORCE_REIMPORT_FORBIDDEN'
    );
});

test('F4.1 HUE queued work externally completed before lease skips executor', async () => {
    const queueDbPath = path.join(sandbox, 'queue-skip.sqlite');
    await applyAutoBackfillQueueSchema(queueDbPath);
    await applyAutoBackfillSafetySchema(queueDbPath);
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

test('F4.1 TCT queued work externally completed before lease skips executor', async () => {
    const queueDbPath = path.join(sandbox, 'queue-tct-skip.sqlite');
    await applyAutoBackfillQueueSchema(queueDbPath);
    await applyAutoBackfillSafetySchema(queueDbPath);
    const statuses = new Map();
    let executions = 0;
    const executorRegistry = new AutoBackfillExecutorRegistry();
    executorRegistry.register(F41_EXECUTOR_IDENTITIES.HUE.id, { async execute() {} }, { verified: true });
    executorRegistry.register(F41_EXECUTOR_IDENTITIES.TCT.id, { async execute() { executions += 1; } }, { verified: true });
    const service = makeF41QueueService({ dbPath: queueDbPath, statuses, executorRegistry, workerId: 'tct-skip' });
    const created = await service.createRun({ actor: 'admin', roles: ['admin'], lane: 'TCT' });
    assert.equal(created.jobs.length, 1);
    statuses.set('F4.1|TCT|2026-01-01', 'SUCCESS');
    assert.equal((await service.processNext()).state, 'SKIPPED_ALREADY_SUCCESS');
    assert.equal(executions, 0);
});

test('shared global lease prevents concurrent F4.1 HUE and TCT execution', async () => {
    const queueDbPath = path.join(sandbox, 'queue-f41-global-lease.sqlite');
    await applyAutoBackfillQueueSchema(queueDbPath);
    await applyAutoBackfillSafetySchema(queueDbPath);
    const statuses = new Map();
    const started = deferred();
    const release = deferred();
    const calls = [];
    let concurrent = 0;
    let maximumConcurrent = 0;
    const session = createSessionHarness();
    session.service.preflight = async (source) => ({ status: 'SESSION_VALID', source });
    session.service.getRegistryState = (source) => ({ activeOperation: null, source });
    session.service.getInteractiveClient = (source) => ({ source });
    const executorRegistry = new AutoBackfillExecutorRegistry();
    registerF41AutoBackfillExecutors(executorRegistry, {
        sessionPreflightService: session.service,
        hueAdapter: {
            async runOneDate(date) {
                calls.push(`HUE:${date}`);
                concurrent += 1;
                maximumConcurrent = Math.max(maximumConcurrent, concurrent);
                started.resolve();
                await release.promise;
                statuses.set(`F4.1|HUE|${date}`, 'SUCCESS');
                concurrent -= 1;
                return { status: 'SUCCESS' };
            },
        },
        tctAdapter: {
            async runOneDate(date) {
                calls.push(`TCT:${date}`);
                concurrent += 1;
                maximumConcurrent = Math.max(maximumConcurrent, concurrent);
                statuses.set(`F4.1|TCT|${date}`, 'SUCCESS');
                concurrent -= 1;
                return { status: 'SUCCESS' };
            },
        },
    });
    const creator = makeF41QueueService({ dbPath: queueDbPath, statuses, executorRegistry, workerId: 'f41-creator' });
    assert.equal((await creator.createRun({ actor: 'admin', roles: ['admin'] })).jobs.length, 2);
    const workerA = makeF41QueueService({ dbPath: queueDbPath, statuses, executorRegistry, workerId: 'f41-worker-a' });
    const workerB = makeF41QueueService({ dbPath: queueDbPath, statuses, executorRegistry, workerId: 'f41-worker-b' });
    const first = workerA.processNext();
    await started.promise;
    assert.equal(await workerB.processNext(), null);
    assert.equal(calls.length, 1);
    release.resolve();
    await first;
    await workerB.processNext();
    assert.deepEqual(calls, ['HUE:2026-01-01', 'TCT:2026-01-01']);
    assert.equal(maximumConcurrent, 1);
});

test('runtime registers both verified F4.1 executors before coordinator startup', () => {
    const runtime = buildRuntime({
        runtimeDbPath: path.join(sandbox, 'runtime.sqlite'),
        completionDb: { async all() { return []; }, async get() { return null; } },
    });
    assert.ok(runtime.executorRegistry.getVerified(F41_EXECUTOR_IDENTITIES.HUE.id));
    assert.ok(runtime.executorRegistry.getVerified(F41_EXECUTOR_IDENTITIES.TCT.id));
    assert.equal(runtime.coordinator.snapshot().started, false);
    assert.equal(INDICATORS['F4.1'].lanes.HUE.automationMode, 'AUTOMATED');
    assert.equal(INDICATORS['F4.1'].lanes.TCT.automationMode, 'AUTOMATED');
    assert.equal(INDICATORS['F4.1'].lanes.TCT.portalAdapter.id, F41_EXECUTOR_IDENTITIES.TCT.id);
});

// ---------------------------------------------------------------------------
// AB-AUTH-05 follow-up: assertSummary() logs exactly which condition failed, with the real
// values read from the portal page, instead of only the final error code + hash (as happened
// for real run 208e49c4, F4.1/HUE 23/08, where the exact cause could not be determined after
// the fact).
// ---------------------------------------------------------------------------

test('F4.1 HUE assertSummary logs every failed condition by name with its real value before throwing', () => {
    const logs = [];
    const service = new F41HueSingleDateService({ logger: { warn: (...args) => logs.push(args.join(' ')) } });
    // Only requiredUnits and exportIdentity are wrong here; totalVolume/passedVolume/rate are
    // internally consistent (2 total, 1 passed, 50%) so they must NOT appear in the failure list.
    const badSummary = {
        unitCount: 5,
        unitCodes: REQUIRED_HUE_BCVH_CODES.slice(1),
        totalVolume: 2,
        passedVolume: 1,
        rate: '50%',
        exportIdentity: 'WRONG_IDENTITY'
    };
    assert.throws(() => service.assertSummary(badSummary), (error) => {
        assert.equal(error.code, 'F41_HUE_OUTER_SUMMARY_INVALID');
        assert.match(error.message, /requiredUnits/);
        assert.match(error.message, /exportIdentity/);
        assert.doesNotMatch(error.message, /totalVolume/);
        assert.doesNotMatch(error.message, /passedVolume/);
        return true;
    });
    assert.equal(logs.length, 1, 'exactly one diagnostic log line must be written before the throw');
    assert.match(logs[0], /\[F41_HUE_SUMMARY\]/);
    assert.match(logs[0], /requiredUnits/);
    assert.match(logs[0], new RegExp(REQUIRED_HUE_BCVH_CODES[0]), 'the log must name the missing code, not just the field');
    assert.match(logs[0], /exportIdentity/);
});

test('F4.1 HUE assertSummary does not throw or log when every condition holds', () => {
    const logs = [];
    const service = new F41HueSingleDateService({ logger: { warn: (...args) => logs.push(args.join(' ')) } });
    assert.doesNotThrow(() => service.assertSummary({
        unitCount: 8,
        unitCodes: [...REQUIRED_HUE_BCVH_CODES],
        totalVolume: 2,
        passedVolume: 1,
        rate: '50%',
        exportIdentity: F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity,
    }));
    assert.equal(logs.length, 0);
});

// AB-AUTH-16 (PO rule change, LEVEL 2): a day where a NON-required unit is absent -- a province
// total line, a retired code such as 531120, a khách vãng lai -- is normal data and must PASS,
// even though the row total no longer matches the old frozen 9.
test('F4.1 HUE assertSummary PASSES when only non-required units are absent', () => {
    const logs = [];
    const service = new F41HueSingleDateService({ logger: { warn: (...args) => logs.push(args.join(' ')) } });
    assert.doesNotThrow(() => service.assertSummary({
        unitCount: 6,
        unitCodes: [...REQUIRED_HUE_BCVH_CODES],
        totalVolume: 2,
        passedVolume: 1,
        rate: '50%',
        exportIdentity: F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity,
    }));
    assert.equal(logs.length, 0, 'a day missing only optional units must not even warn');
});

test('F4.1 HUE assertSummary PASSES when extra unrequired units are present alongside all six', () => {
    const service = new F41HueSingleDateService({ logger: { warn: () => {} } });
    assert.doesNotThrow(() => service.assertSummary({
        unitCount: 12,
        unitCodes: ['531120', '', ...REQUIRED_HUE_BCVH_CODES, '999999'],
        totalVolume: 2,
        passedVolume: 1,
        rate: '50%',
        exportIdentity: F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity,
    }));
});

// AB-AUTH-16 (LEVEL 2): the rule must still bite. Missing ONE of the six canonical BCVH units is a
// real defect and must FAIL, naming the missing code -- for every one of the six, not just the first.
test('F4.1 HUE assertSummary FAILS when any single required BCVH unit is missing', () => {
    for (const missing of REQUIRED_HUE_BCVH_CODES) {
        const service = new F41HueSingleDateService({ logger: { warn: () => {} } });
        const summary = {
            unitCount: 20,
            unitCodes: REQUIRED_HUE_BCVH_CODES.filter((code) => code !== missing),
            totalVolume: 2,
            passedVolume: 1,
            rate: '50%',
            exportIdentity: F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity,
        };
        assert.throws(() => service.assertSummary(summary), (error) => {
            assert.equal(error.code, 'F41_HUE_OUTER_SUMMARY_INVALID');
            assert.match(error.message, /requiredUnits/);
            assert.equal(error.details.checks.requiredUnits.value, `missing ${missing}`);
            return true;
        }, `missing BCVH ${missing} must be rejected`);
    }
});

test('F4.1 TCT assertSummary logs every failed condition by name with its real value before throwing', () => {
    const logs = [];
    const service = new F41TctSingleDateService({ logger: { warn: (...args) => logs.push(args.join(' ')) } });
    const summary = { outerRowCount: 40, provinceCodes: REQUIRED_TCT_PROVINCE_CODES.slice(1), exportIdentity: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity };
    assert.throws(() => service.assertSummary(summary), (error) => {
        assert.equal(error.code, 'F41_TCT_OUTER_SUMMARY_INVALID');
        assert.match(error.message, /requiredProvinces/);
        assert.doesNotMatch(error.message, /exportIdentity/);
        return true;
    });
    assert.equal(logs.length, 1);
    assert.match(logs[0], /\[F41_TCT_SUMMARY\]/);
    assert.match(logs[0], new RegExp(REQUIRED_TCT_PROVINCE_CODES[0]), 'the log must name the missing province code');
});

test('F4.1 TCT assertSummary does not throw or log when every condition holds', () => {
    const logs = [];
    const service = new F41TctSingleDateService({ logger: { warn: (...args) => logs.push(args.join(' ')) } });
    assert.doesNotThrow(() => service.assertSummary({ outerRowCount: 38, provinceCodes: [...REQUIRED_TCT_PROVINCE_CODES], exportIdentity: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity }));
    assert.equal(logs.length, 0);
});

// AB-AUTH-16 (LEVEL 2): the real 2026-08-23 shape -- 38 outer rows, all 34 ranked provinces plus a
// blank grand-total cell and three non-ranked units (EMS 01, Từ Liêm 14, 49). Under the old count
// rule this was rejected; it is valid data and must now PASS.
test('F4.1 TCT assertSummary PASSES on the real 23/08 shape (38 rows, non-required units absent)', () => {
    const logs = [];
    const service = new F41TctSingleDateService({ logger: { warn: (...args) => logs.push(args.join(' ')) } });
    assert.doesNotThrow(() => service.assertSummary({
        outerRowCount: 38,
        provinceCodes: ['01', '14', '49', ...REQUIRED_TCT_PROVINCE_CODES],
        exportIdentity: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity,
    }));
    assert.equal(logs.length, 0);
});

test('F4.1 TCT assertSummary FAILS when any single required province is missing', () => {
    for (const missing of [REQUIRED_TCT_PROVINCE_CODES[0], REQUIRED_TCT_PROVINCE_CODES[17], REQUIRED_TCT_PROVINCE_CODES.at(-1)]) {
        const service = new F41TctSingleDateService({ logger: { warn: () => {} } });
        const summary = {
            outerRowCount: 100,
            provinceCodes: REQUIRED_TCT_PROVINCE_CODES.filter((code) => code !== missing),
            exportIdentity: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity,
        };
        assert.throws(() => service.assertSummary(summary), (error) => {
            assert.equal(error.code, 'F41_TCT_OUTER_SUMMARY_INVALID');
            assert.equal(error.details.checks.requiredProvinces.value, `missing ${missing}`);
            return true;
        }, `missing province ${missing} must be rejected`);
    }
});

// AB-AUTH-16 (LEVEL 2): unit codes are identifiers, and the matching must be tolerant of the
// portal handing a cell back as a number while still refusing a code that is genuinely absent.
test('F4.1 TCT assertSummary accepts a numerically-typed province code but still catches a real absence', () => {
    const service = new F41TctSingleDateService({ logger: { warn: () => {} } });
    const withoutTen = REQUIRED_TCT_PROVINCE_CODES.filter((code) => code !== '10');
    // 10 (number) is the same identifier as '10' -- must PASS.
    assert.doesNotThrow(() => service.assertSummary({
        outerRowCount: 38,
        provinceCodes: [...withoutTen, 10],
        exportIdentity: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity,
    }));
    // Genuinely absent -- must still FAIL, and name the code.
    assert.throws(() => service.assertSummary({
        outerRowCount: 38,
        provinceCodes: withoutTen,
        exportIdentity: F41_EXECUTOR_IDENTITIES.TCT.resourceIdentity,
    }), (error) => error.code === 'F41_TCT_OUTER_SUMMARY_INVALID' && error.details.checks.requiredProvinces.value === 'missing 10');
});

// ---------------------------------------------------------------------------
// DIAGNOSTIC-TEMP (AB-AUTH-09): assertSummary()'s portalClient/businessDate params are optional
// and additive -- must fire portalClient.captureF41Diagnostics() (reason OUTER_SUMMARY_INVALID)
// when rejecting, but only when a portalClient exposing that method is actually passed, and
// never when the summary is valid. assertSummary() must stay synchronous either way (existing
// tests above call it with `assert.throws(() => service.assertSummary(summary))`, no portalClient,
// no await -- confirmed still passing).
// ---------------------------------------------------------------------------

test('F4.1 HUE assertSummary fires captureF41Diagnostics with businessDate/reason when rejecting and a portalClient is passed', () => {
    const captureCalls = [];
    const portalClient = { captureF41Diagnostics: async (args) => { captureCalls.push(args); } };
    const service = new F41HueSingleDateService({ logger: { warn: () => {} } });
    assert.throws(() => service.assertSummary({ unitCount: 0 }, portalClient, '2026-08-23'), (error) => error.code === 'F41_HUE_OUTER_SUMMARY_INVALID');
    assert.equal(captureCalls.length, 1, 'captureF41Diagnostics must be called exactly once');
    assert.deepEqual(captureCalls[0], { businessDate: '2026-08-23', reason: 'OUTER_SUMMARY_INVALID' });
});

test('F4.1 HUE assertSummary stays synchronous (does not await the capture) and still throws even if the capture hook rejects', () => {
    const service = new F41HueSingleDateService({ logger: { warn: () => {} } });
    const portalClient = { captureF41Diagnostics: async () => { throw new Error('capture boom'); } };
    assert.throws(() => service.assertSummary({ unitCount: 0 }, portalClient, '2026-08-23'), (error) => error.code === 'F41_HUE_OUTER_SUMMARY_INVALID');
});

test('F4.1 HUE assertSummary never calls captureF41Diagnostics when no portalClient is passed (backward compatible with existing 1-arg call sites)', () => {
    const service = new F41HueSingleDateService({ logger: { warn: () => {} } });
    assert.throws(() => service.assertSummary({ unitCount: 0 }), (error) => error.code === 'F41_HUE_OUTER_SUMMARY_INVALID');
});

test('F4.1 HUE assertSummary never calls captureF41Diagnostics when the summary is valid', () => {
    let captureCalled = false;
    const portalClient = { captureF41Diagnostics: async () => { captureCalled = true; } };
    const service = new F41HueSingleDateService({ logger: { warn: () => {} } });
    assert.doesNotThrow(() => service.assertSummary({
        unitCount: 8, unitCodes: [...REQUIRED_HUE_BCVH_CODES], totalVolume: 2, passedVolume: 1, rate: '50%', exportIdentity: F41_EXECUTOR_IDENTITIES.HUE.resourceIdentity,
    }, portalClient, '2026-08-23'));
    assert.equal(captureCalled, false);
});

test('F4.1 TCT assertSummary fires captureF41Diagnostics with businessDate/reason when rejecting and a portalClient is passed', () => {
    const captureCalls = [];
    const portalClient = { captureF41Diagnostics: async (args) => { captureCalls.push(args); } };
    const service = new F41TctSingleDateService({ logger: { warn: () => {} } });
    assert.throws(() => service.assertSummary({ outerRowCount: 40 }, portalClient, '2026-08-24'), (error) => error.code === 'F41_TCT_OUTER_SUMMARY_INVALID');
    assert.equal(captureCalls.length, 1, 'captureF41Diagnostics must be called exactly once');
    assert.deepEqual(captureCalls[0], { businessDate: '2026-08-24', reason: 'OUTER_SUMMARY_INVALID' });
});

test('F4.1 TCT assertSummary never calls captureF41Diagnostics when no portalClient is passed (backward compatible with existing 1-arg call sites)', () => {
    const service = new F41TctSingleDateService({ logger: { warn: () => {} } });
    assert.throws(() => service.assertSummary({ outerRowCount: 40 }), (error) => error.code === 'F41_TCT_OUTER_SUMMARY_INVALID');
});

// ---------------------------------------------------------------------------
// AB-AUTH-05 follow-up: F41AutoBackfillExecutor.validateSession() was missed when AB-AUTH-05
// (commit d4193263) shipped for F13AutoBackfillExecutor -- this reproduces, for F4.1, the exact
// symptom the Product Owner reported: "Mở đăng nhập HUE" flashing uselessly and "Tiếp tục Run"
// reporting "A valid manual HUE session is required" right after a successful login.
// ---------------------------------------------------------------------------

function makeF41ExecutorWithPreflight(preflightImpl) {
    return new F41AutoBackfillExecutor({
        identity: F41_EXECUTOR_IDENTITIES.HUE,
        adapter: {},
        sessionPreflightService: {
            preflight: preflightImpl,
            withSourceLock: (source, fn) => fn(),
            getRegistryState: () => ({}),
            getInteractiveClient: () => ({}),
        },
    });
}

test('AB-AUTH-05 follow-up: F41 validateSession returns the preflight result on SESSION_VALID', async () => {
    const executor = makeF41ExecutorWithPreflight(async () => ({ status: 'SESSION_VALID' }));
    const result = await executor.validateSession();
    assert.equal(result.status, 'SESSION_VALID');
});

for (const pendingStatus of ['LOGIN_IN_PROGRESS', 'LOGIN_TIMEOUT']) {
    test(`AB-AUTH-05 follow-up: F41 validateSession classifies ${pendingStatus} as PENDING (TRANSIENT, retryable), not a hard auth failure`, async () => {
        const executor = makeF41ExecutorWithPreflight(async () => ({ status: pendingStatus, message: 'still waiting' }));
        await assert.rejects(executor.validateSession(), (error) => {
            assert.equal(error.code, 'SESSION_PENDING_HUMAN_ACTION');
            assert.equal(error.autoBackfill?.classification, 'TRANSIENT');
            return true;
        });
    });
}

for (const blockedStatus of ['AUTHENTICATION_REQUIRED', 'SESSION_CHECK_FAILED', undefined]) {
    test(`AB-AUTH-05 follow-up: F41 validateSession still classifies ${blockedStatus ?? '(no status)'} as a real BLOCKED auth failure`, async () => {
        const executor = makeF41ExecutorWithPreflight(async () => ({ status: blockedStatus }));
        await assert.rejects(executor.validateSession(), (error) => {
            assert.equal(error.code, 'AUTHENTICATION_REQUIRED');
            return true;
        });
    });
}

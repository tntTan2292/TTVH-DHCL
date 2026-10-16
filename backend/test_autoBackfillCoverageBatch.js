'use strict';

// Coverage scan speed-up: the batched completion path must give exactly the per-date answers, and the scan cache
// must be single-flight, short-lived and dropped by every writer that bumps the coverage version.
// Run per file: node --test --experimental-sqlite test_autoBackfillCoverageBatch.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createSqliteImportCompletionPolicy } = require('./src/services/autoBackfillCompletionPolicies');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { DEFAULT_PERMISSIONS, DEFAULT_RETRY_POLICY, createFilenameDateRule } = require('./src/services/importIndicatorRegistry');
const { bumpCoverageVersion } = require('./src/services/coverageVersion');

const CIRCUIT_SCOPE = Object.freeze({ dimensions: ['adapter', 'source', 'resource'], threshold: 5, sameSignatureConsecutive: true, integrityFailureStopsImmediately: true });
const silent = { log() {} };
const noExceptions = { async loadActiveExceptionMap() { return new Map(); } };
const noHolidays = { async loadActiveHolidayMap() { return new Map(); } };

function createDb() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(`
        CREATE TABLE import_log (id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT, ngay_do_kiem TEXT, indicator TEXT, source_lane TEXT, status TEXT,
            total_records INTEGER DEFAULT 0, error_records INTEGER DEFAULT 0, skipped_records INTEGER DEFAULT 0);
        CREATE TABLE fact_t (id INTEGER PRIMARY KEY AUTOINCREMENT, ngay_do_kiem TEXT, ma TEXT, tinh TEXT);
    `);
    let queries = 0;
    return {
        sqlite,
        get queries() { return queries; },
        async get(sql, params = []) { queries += 1; return sqlite.prepare(sql).get(...params); },
        async all(sql, params = []) { queries += 1; return sqlite.prepare(sql).all(...params); },
    };
}

function indicatorWith(policyOptions, processedDir) {
    const filenameDateRule = createFilenameDateRule({ id: 'T_DATE', prefix: 'T', parse: () => '2026-01-01' });
    const policy = createSqliteImportCompletionPolicy({ id: 'T_POLICY', ...policyOptions });
    return {
        code: 'F9.T',
        key: 'F9.T',
        name: 'Batch Test',
        status: 'ACTIVE',
        priority: 10,
        trackingStartDate: '2026-01-01',
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: 'F9T',
        filenamePattern: /\.xlsx$/i,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir,
        lanes: {
            HUE: {
                code: 'HUE',
                priority: 10,
                parser: () => ({ parsedData: [] }),
                targetTable: 'fact_t',
                completionPolicy: policy,
                automationMode: 'AUTOMATED',
                manualOnlyReason: null,
                portalAdapter: { id: 'TEST_T_HUE', verified: true, reportIdentity: 'R', resourceIdentity: 'X' },
                permissions: { ...DEFAULT_PERMISSIONS, coverageReadRoles: ['admin'] },
                retryPolicy: DEFAULT_RETRY_POLICY,
                circuitScope: CIRCUIT_SCOPE,
            },
        },
    };
}

function seed(db, processedDir, indicator) {
    const add = (date, rows, dupes = false, tinh = 'A') => {
        for (let i = 0; i < rows; i += 1) db.sqlite.prepare('INSERT INTO fact_t (ngay_do_kiem, ma, tinh) VALUES (?, ?, ?)').run(date, dupes ? 'X' : `M${i}`, tinh);
    };
    const log = (date, status) => db.sqlite.prepare('INSERT INTO import_log (file_name, ngay_do_kiem, indicator, source_lane, status) VALUES (?, ?, ?, ?, ?)').run('f', date, 'F9.T', 'HUE', status);
    add('2026-01-02', 3); // complete
    add('2026-01-03', 3, true); // duplicates -> integrity mismatch
    log('2026-01-04', 'FAILED'); // only failed attempts
    log('2026-01-05', 'SUCCESS'); // evidence without data
    add('2026-01-06', 2); log('2026-01-06', 'SUCCESS'); // data + log
    add('2026-01-07', 2, false, 'B'); // required value B only
    fs.mkdirSync(path.join(processedDir, 'HUE'), { recursive: true });
    fs.writeFileSync(path.join(processedDir, 'HUE', indicator.lanes.HUE.completionPolicy.id === 'x' ? 'unused' : indicator.filenameDateRule.format('2026-01-08')), 'x'); // artifact only
    add('2026-01-09', 1);
}

const AS_OF = new Date('2026-01-11T01:00:00.000Z'); // newest day 10 Jan

for (const [label, options] of [
    ['single distinct column', { distinctColumn: 'ma' }],
    ['composite key and required values', { distinctColumn: ['ma', 'tinh'], requiredValues: { column: 'tinh', values: ['A', 'B'] } }],
    ['expected row count and no artifact requirement', { distinctColumn: 'ma', expectedRowCount: 3, requireProcessedArtifact: false }],
]) {
    test(`batched completion equals per-date completion (${label})`, async () => {
        const processedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-batch-'));
        try {
            const db = createDb();
            const indicator = indicatorWith(options, processedDir);
            seed(db, processedDir, indicator);
            const make = (batchEvaluation) => new AutoBackfillCoverageService({
                db, fsImpl: fs, clock: () => AS_OF, registryProvider: () => [indicator], registryVersion: 'T', batchEvaluation, cacheTtlMs: 0, logger: silent, exceptionService: noExceptions, holidayCalendarService: noHolidays,
            });
            const before = db.queries;
            const oldScan = await make(false).scan({ roles: ['admin'] });
            const oldQueries = db.queries - before;
            const mid = db.queries;
            const newScan = await make(true).scan({ roles: ['admin'] });
            const newQueries = db.queries - mid;
            assert.deepEqual(newScan, oldScan);
            assert.ok(newScan.items.length >= 10);
            assert.ok(newQueries < oldQueries, `batched scan must ask fewer questions (${newQueries} vs ${oldQueries})`);
            assert.ok(new Set(newScan.items.map((item) => item.completion_reason)).size >= 3, 'fixture covers several outcomes');
        } finally { fs.rmSync(processedDir, { recursive: true, force: true }); }
    });
}

test('scan cache: hit, single-flight, fresh bypass, invalidation by version and by TTL', async () => {
    const processedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-cache-'));
    try {
        const db = createDb();
        const indicator = indicatorWith({ distinctColumn: 'ma' }, processedDir);
        seed(db, processedDir, indicator);
        const service = new AutoBackfillCoverageService({
            db, fsImpl: fs, clock: () => AS_OF, registryProvider: () => [indicator], registryVersion: 'T', cacheTtlMs: 60000, logger: silent, exceptionService: noExceptions, holidayCalendarService: noHolidays,
        });
        const args = { roles: ['admin'] };

        const [a, b, c] = await Promise.all([service.scanWithMeta(args), service.scanWithMeta(args), service.scanWithMeta(args)]);
        assert.deepEqual([a.meta.cache, b.meta.cache, c.meta.cache].sort(), ['joined', 'joined', 'miss']);
        assert.equal(a.result, b.result);

        const q = db.queries;
        assert.equal((await service.scanWithMeta(args)).meta.cache, 'hit');
        assert.equal(db.queries, q, 'a hit reads nothing');

        assert.equal((await service.scanWithMeta({ ...args, fresh: true })).meta.cache, 'fresh');
        assert.equal((await service.scanWithMeta({ roles: ['admin'], indicator: 'F9.T' })).meta.cache, 'miss', 'a different scope is its own entry');

        // a writer drops the cache: a new day's data shows up
        db.sqlite.prepare('INSERT INTO fact_t (ngay_do_kiem, ma, tinh) VALUES (?, ?, ?)').run('2026-01-10', 'Z', 'A');
        assert.equal((await service.scanWithMeta(args)).meta.cache, 'hit', 'still cached until something bumps the version');
        bumpCoverageVersion();
        const refreshed = await service.scanWithMeta(args);
        assert.equal(refreshed.meta.cache, 'miss');
        assert.equal(refreshed.result.items.find((item) => item.business_date === '2026-01-10').status, 'COMPLETED');

        // TTL
        const short = new AutoBackfillCoverageService({
            db, fsImpl: fs, clock: () => AS_OF, registryProvider: () => [indicator], registryVersion: 'T', cacheTtlMs: 5, logger: silent, exceptionService: noExceptions, holidayCalendarService: noHolidays,
        });
        await short.scan(args);
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.equal((await short.scanWithMeta(args)).meta.cache, 'miss');
    } finally { fs.rmSync(processedDir, { recursive: true, force: true }); }
});

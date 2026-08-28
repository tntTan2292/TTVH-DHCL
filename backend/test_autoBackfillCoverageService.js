'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const {
    DEFAULT_PERMISSIONS,
    DEFAULT_RETRY_POLICY,
    createFilenameDateRule,
    validateIndicatorRegistry,
} = require('./src/services/importIndicatorRegistry');
const { createSqliteImportCompletionPolicy } = require('./src/services/autoBackfillCompletionPolicies');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');

const APPROVED_CIRCUIT_SCOPE = Object.freeze({
    dimensions: ['adapter', 'source', 'resource'],
    threshold: 5,
    sameSignatureConsecutive: true,
    integrityFailureStopsImmediately: true,
});

function createLane({
    code = 'HUE',
    priority = 10,
    targetTable = 'fact_f9_test',
    completionPolicy,
    automationMode = 'MANUAL_ONLY',
    manualOnlyReason = 'PORTAL_ADAPTER_NOT_REGISTERED',
}) {
    return {
        code,
        priority,
        parser: () => ({ parsedData: [], totalParsed: 0 }),
        targetTable,
        completionPolicy,
        automationMode,
        manualOnlyReason,
        portalAdapter: automationMode === 'AUTOMATED' ? {
            id: 'TEST_ADAPTER',
            verified: true,
            reportIdentity: 'TEST_REPORT',
            resourceIdentity: 'TEST_RESOURCE',
        } : null,
        permissions: DEFAULT_PERMISSIONS,
        retryPolicy: DEFAULT_RETRY_POLICY,
        circuitScope: APPROVED_CIRCUIT_SCOPE,
    };
}

function createIndicator({
    code = 'F9.TEST',
    startDate = '2026-01-01',
    priority = 10,
    processedDir = path.join(os.tmpdir(), 'qis-auto-backfill-unused'),
    lanes,
}) {
    const filenameDateRule = createFilenameDateRule({
        id: `${code}_TEST_DATE`,
        prefix: code,
        parse: () => startDate,
    });
    return {
        code,
        key: code,
        name: `${code} Test Indicator`,
        status: 'ACTIVE',
        priority,
        trackingStartDate: startDate,
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: code,
        filenamePattern: /\.xlsx$/i,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir,
        lanes,
    };
}

function createMapPolicy(statusByKey = new Map()) {
    return {
        id: 'F9_TEST_MAP_POLICY',
        async evaluate({ indicator, lane, businessDate }) {
            const key = `${indicator.code}|${lane.code}|${businessDate}`;
            const status = statusByKey.get(key) || 'MISSING';
            return { status, reason: status === 'SUCCESS' ? 'COMPLETE_EVIDENCE' : 'NO_IMPORT_EVIDENCE', evidence: { key } };
        },
    };
}

function createMemoryDb() {
    const raw = new sqlite3.Database(':memory:');
    return {
        raw,
        run(sql, params = []) {
            return new Promise((resolve, reject) => raw.run(sql, params, function onRun(error) {
                if (error) reject(error);
                else resolve(this);
            }));
        },
        get(sql, params = []) {
            return new Promise((resolve, reject) => raw.get(sql, params, (error, row) => {
                if (error) reject(error);
                else resolve(row);
            }));
        },
        all(sql, params = []) {
            return new Promise((resolve, reject) => raw.all(sql, params, (error, rows) => {
                if (error) reject(error);
                else resolve(rows);
            }));
        },
        exec(sql) {
            return new Promise((resolve, reject) => raw.exec(sql, (error) => error ? reject(error) : resolve()));
        },
        close() {
            return new Promise((resolve, reject) => raw.close((error) => error ? reject(error) : resolve()));
        },
    };
}

async function createIsolationFixture() {
    const db = createMemoryDb();
    await db.exec(`
        CREATE TABLE import_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            indicator TEXT NOT NULL,
            source_lane TEXT NOT NULL,
            ngay_do_kiem TEXT NOT NULL,
            status TEXT NOT NULL,
            total_records INTEGER DEFAULT 0,
            error_records INTEGER DEFAULT 0,
            skipped_records INTEGER DEFAULT 0
        );
        CREATE TABLE fact_f13_hue (ngay_do_kiem TEXT NOT NULL, entity_id TEXT NOT NULL);
        CREATE TABLE fact_f13_tct (ngay_do_kiem TEXT NOT NULL, entity_id TEXT NOT NULL);
        CREATE TABLE fact_f41_hue (ngay_do_kiem TEXT NOT NULL, entity_id TEXT NOT NULL);
        CREATE TABLE fact_f41_tct (ngay_do_kiem TEXT NOT NULL, entity_id TEXT NOT NULL);
        CREATE TABLE auto_backfill_coverage_exception (
            id TEXT PRIMARY KEY,
            indicator TEXT NOT NULL,
            source_lane TEXT NOT NULL,
            business_date TEXT NOT NULL,
            exception_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            reason TEXT NOT NULL,
            evidence_json TEXT,
            registry_version TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            revoked_by TEXT,
            revoked_at TEXT,
            revoke_reason TEXT
        );
        CREATE TABLE auto_backfill_coverage_exception_event (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exception_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            exception_type TEXT NOT NULL,
            indicator TEXT NOT NULL,
            source_lane TEXT NOT NULL,
            business_date TEXT NOT NULL,
            reason TEXT,
            evidence_json TEXT,
            actor TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
    `);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ab-coverage-'));
    const policyFor = (table) => createSqliteImportCompletionPolicy({
        id: `${table.toUpperCase()}_TEST_POLICY`,
        distinctColumn: 'entity_id',
        expectedRowCount: 1,
    });
    const makeLanes = (prefix) => ({
        HUE: createLane({ code: 'HUE', priority: 10, targetTable: `${prefix}_hue`, completionPolicy: policyFor(`${prefix}_hue`) }),
        TCT: createLane({ code: 'TCT', priority: 20, targetTable: `${prefix}_tct`, completionPolicy: policyFor(`${prefix}_tct`) }),
    });
    const registry = [
        createIndicator({ code: 'F1.3', priority: 10, startDate: '2026-01-02', processedDir: path.join(root, 'F1.3', 'Processed'), lanes: makeLanes('fact_f13') }),
        createIndicator({ code: 'F4.1', priority: 20, startDate: '2026-01-02', processedDir: path.join(root, 'F4.1', 'Processed'), lanes: makeLanes('fact_f41') }),
    ];
    return { db, root, registry };
}

function writeArtifact(indicator, lane, businessDate) {
    const directory = path.join(indicator.processedDir, lane);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, indicator.filenameDateRule.format(businessDate)), 'test artifact');
}

test('AB-EXT-01 registers F9.TEST in a fixture without shared-scanner branches', () => {
    const lane = createLane({ completionPolicy: createMapPolicy() });
    const registry = { 'F9.TEST': createIndicator({ lanes: { HUE: lane } }) };
    assert.equal(validateIndicatorRegistry(registry), registry);

    const scannerSource = fs.readFileSync(path.join(__dirname, 'src/services/autoBackfillCoverageService.js'), 'utf8');
    assert.doesNotMatch(scannerSource, /F1\.3|F4\.1|fact_f1|fact_f4/i);
});

test('AB-EXT-02 adds F9.TEST/HUE to coverage from registration only', async () => {
    const indicator = createIndicator({ lanes: { HUE: createLane({ completionPolicy: createMapPolicy() }) } });
    const service = new AutoBackfillCoverageService({ db: {}, registryProvider: () => [indicator] });
    const coverage = await service.scan({ asOf: '2026-01-04', roles: ['admin'] });

    assert.deepEqual(coverage.items.map((item) => item.business_date), ['2026-01-03', '2026-01-02', '2026-01-01']);
    assert.ok(coverage.items.every((item) => item.indicator === 'F9.TEST' && item.source_lane === 'HUE'));
});

test('AB-EXT-03 reports one F9.TEST success and two manual-only gaps with zero runnable jobs', async () => {
    const statuses = new Map([['F9.TEST|HUE|2026-01-03', 'SUCCESS']]);
    const indicator = createIndicator({ lanes: { HUE: createLane({ completionPolicy: createMapPolicy(statuses) }) } });
    const service = new AutoBackfillCoverageService({ db: {}, registryProvider: () => [indicator] });
    const coverage = await service.scan({ asOf: '2026-01-04', roles: ['admin'] });

    assert.deepEqual(coverage.items.map((item) => item.status), ['COMPLETED', 'INCOMPLETE', 'INCOMPLETE']);
    assert.equal(coverage.runnable_portal_jobs, 0);
    assert.ok(coverage.items.every((item) => item.queue_eligible === false));
});

test('AB-EXT-04 changes the F9.TEST coverage window by fixture start date only', async () => {
    const lane = createLane({ completionPolicy: createMapPolicy() });
    const first = createIndicator({ startDate: '2026-01-01', lanes: { HUE: lane } });
    const second = createIndicator({ startDate: '2026-01-02', lanes: { HUE: lane } });
    const scan = async (indicator) => new AutoBackfillCoverageService({ db: {}, registryProvider: () => [indicator] })
        .scan({ asOf: '2026-01-04', roles: ['admin'] });

    assert.equal((await scan(first)).total_items, 3);
    assert.equal((await scan(second)).total_items, 2);
});

test('AB-ISO-01 keeps same-date completion isolated across indicators and lanes', async () => {
    const fixture = await createIsolationFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f13_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-02', 'BG-1')");
        await fixture.db.run("INSERT INTO import_log (indicator, source_lane, ngay_do_kiem, status) VALUES ('F1.3', 'HUE', '2026-01-02', 'SUCCESS')");
        writeArtifact(fixture.registry[0], 'HUE', '2026-01-02');
        const coverage = await new AutoBackfillCoverageService({ db: fixture.db, registryProvider: () => fixture.registry })
            .scan({ asOf: '2026-01-03', roles: ['admin'] });
        const statusByKey = Object.fromEntries(coverage.items.map((item) => [`${item.indicator}|${item.source_lane}`, item.status]));

        assert.equal(statusByKey['F1.3|HUE'], 'COMPLETED');
        assert.equal(statusByKey['F1.3|TCT'], 'INCOMPLETE');
        assert.equal(statusByKey['F4.1|HUE'], 'INCOMPLETE');
        assert.equal(statusByKey['F4.1|TCT'], 'INCOMPLETE');
    } finally {
        await fixture.db.close();
        fs.rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('AB-ISO-02 does not reuse HUE facts, log, or artifact for TCT', async () => {
    const fixture = await createIsolationFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f13_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-02', 'BG-1')");
        await fixture.db.run("INSERT INTO import_log (indicator, source_lane, ngay_do_kiem, status) VALUES ('F1.3', 'HUE', '2026-01-02', 'SUCCESS')");
        writeArtifact(fixture.registry[0], 'HUE', '2026-01-02');
        const coverage = await new AutoBackfillCoverageService({ db: fixture.db, registryProvider: () => [fixture.registry[0]] })
            .scan({ asOf: '2026-01-03', roles: ['admin'] });

        assert.equal(coverage.items.find((item) => item.source_lane === 'HUE').status, 'COMPLETED');
        assert.equal(coverage.items.find((item) => item.source_lane === 'TCT').status, 'INCOMPLETE');
    } finally {
        await fixture.db.close();
        fs.rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('PO policy: committed data with a FILE_MOVE_FAILED log is still SUCCESS -- data presence, not import source, decides completion', async () => {
    const fixture = await createIsolationFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f13_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-02', 'BG-1')");
        await fixture.db.run("INSERT INTO import_log (indicator, source_lane, ngay_do_kiem, status) VALUES ('F1.3', 'HUE', '2026-01-02', 'FILE_MOVE_FAILED')");
        const coverage = await new AutoBackfillCoverageService({ db: fixture.db, registryProvider: () => [fixture.registry[0]] })
            .scan({ asOf: '2026-01-03', lane: 'HUE', roles: ['admin'] });

        assert.equal(coverage.items[0].status, 'COMPLETED');
        assert.equal(coverage.items[0].completion_reason, 'COMPLETE_EVIDENCE');
        assert.equal(coverage.items[0].queue_eligible, false);
        assert.equal(coverage.items[0].queue_ineligible_reason, 'ALREADY_SUCCESS');
        // Internal evidence is preserved even though it no longer gates the status.
        assert.equal(coverage.items[0].evidence.file_move_failed_log_count, 1);
        assert.equal(coverage.items[0].evidence.success_log_count, 0);
    } finally {
        await fixture.db.close();
        fs.rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('PO policy: committed data with a missing Processed artifact is still SUCCESS', async () => {
    const fixture = await createIsolationFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f13_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-02', 'BG-1')");
        await fixture.db.run("INSERT INTO import_log (indicator, source_lane, ngay_do_kiem, status) VALUES ('F1.3', 'HUE', '2026-01-02', 'SUCCESS')");
        const coverage = await new AutoBackfillCoverageService({ db: fixture.db, registryProvider: () => [fixture.registry[0]] })
            .scan({ asOf: '2026-01-03', lane: 'HUE', roles: ['admin'] });

        assert.equal(coverage.items[0].status, 'COMPLETED');
        assert.equal(coverage.items[0].completion_reason, 'COMPLETE_EVIDENCE');
        assert.equal(coverage.items[0].queue_eligible, false);
        // Internal evidence is preserved even though it no longer gates the status.
        assert.equal(coverage.items[0].evidence.processed_artifact_present, false);
    } finally {
        await fixture.db.close();
        fs.rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('PO policy: committed data with NEITHER an import_log row NOR a Processed artifact is still SUCCESS', async () => {
    const fixture = await createIsolationFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f13_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-02', 'BG-1')");
        const coverage = await new AutoBackfillCoverageService({ db: fixture.db, registryProvider: () => [fixture.registry[0]] })
            .scan({ asOf: '2026-01-03', lane: 'HUE', roles: ['admin'] });

        assert.equal(coverage.items[0].status, 'COMPLETED');
        assert.equal(coverage.items[0].completion_reason, 'COMPLETE_EVIDENCE');
        assert.equal(coverage.items[0].queue_eligible, false);
        assert.equal(coverage.items[0].evidence.import_log_count, 0);
        assert.equal(coverage.items[0].evidence.success_log_count, 0);
        assert.equal(coverage.items[0].evidence.processed_artifact_present, false);
    } finally {
        await fixture.db.close();
        fs.rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('duplicate committed rows (integrity invalid) still require manual review, never SUCCESS', async () => {
    const fixture = await createIsolationFixture();
    try {
        // expectedRowCount is 1 for this fixture's policy; a 2nd distinct entity
        // for the same date makes rowCount (2) diverge from expectedRowCount,
        // and distinctCount (2) === rowCount (2) so this exercises the
        // rowCount-mismatch integrity path, not the duplicate-id path.
        await fixture.db.run("INSERT INTO fact_f13_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-02', 'BG-1')");
        await fixture.db.run("INSERT INTO fact_f13_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-02', 'BG-2')");
        await fixture.db.run("INSERT INTO import_log (indicator, source_lane, ngay_do_kiem, status) VALUES ('F1.3', 'HUE', '2026-01-02', 'SUCCESS')");
        writeArtifact(fixture.registry[0], 'HUE', '2026-01-02');
        const coverage = await new AutoBackfillCoverageService({ db: fixture.db, registryProvider: () => [fixture.registry[0]] })
            .scan({ asOf: '2026-01-03', lane: 'HUE', roles: ['admin'] });

        assert.equal(coverage.items[0].status, 'DATA_ERROR');
        assert.equal(coverage.items[0].completion_reason, 'COMMITTED_DATA_INTEGRITY_MISMATCH');
        assert.equal(coverage.items[0].queue_eligible, false);
        assert.equal(coverage.items[0].evidence.row_count, 2);
        assert.equal(coverage.items[0].evidence.expected_row_count, 1);
    } finally {
        await fixture.db.close();
        fs.rmSync(fixture.root, { recursive: true, force: true });
    }
});

test('approved registry automates all independently verified F1.3 and F4.1 lanes', () => {
    const { INDICATORS } = require('./src/services/importIndicatorRegistry');
    for (const indicator of Object.values(INDICATORS)) {
        assert.equal(indicator.trackingStartDate, '2026-01-01');
        assert.equal(indicator.businessTimezone, 'Asia/Ho_Chi_Minh');
    }
    assert.equal(INDICATORS['F1.3'].lanes.HUE.automationMode, 'AUTOMATED');
    assert.equal(INDICATORS['F1.3'].lanes.HUE.portalAdapter.id, 'DKCL_F13_HUE_SINGLE_DATE_V1');
    assert.equal(INDICATORS['F1.3'].lanes.TCT.automationMode, 'AUTOMATED');
    assert.equal(INDICATORS['F1.3'].lanes.TCT.portalAdapter.id, 'DKCL_F13_TCT_SINGLE_DATE_V1');
    assert.equal(INDICATORS['F4.1'].lanes.HUE.automationMode, 'AUTOMATED');
    assert.equal(INDICATORS['F4.1'].lanes.HUE.portalAdapter.id, 'DKCL_F41_HUE_SINGLE_DATE_V1');
    assert.equal(INDICATORS['F4.1'].lanes.HUE.portalAdapter.resourceIdentity, 'sp_Phat_ChatLuong_PTC_BuuCuc_V2');
    assert.equal(INDICATORS['F4.1'].lanes.TCT.automationMode, 'AUTOMATED');
    assert.equal(INDICATORS['F4.1'].lanes.TCT.portalAdapter.id, 'DKCL_F41_TCT_SINGLE_DATE_V1');
    assert.equal(INDICATORS['F4.1'].lanes.TCT.portalAdapter.resourceIdentity, 'sp_Phat_ChatLuong_PTC_Tinh_V2');
});

test('an automated registration never makes an existing SUCCESS queue eligible', async () => {
    const statuses = new Map([['F9.TEST|HUE|2026-01-01', 'SUCCESS']]);
    const indicator = createIndicator({ lanes: {
        HUE: createLane({ automationMode: 'AUTOMATED', completionPolicy: createMapPolicy(statuses) }),
    } });
    const coverage = await new AutoBackfillCoverageService({ db: {}, registryProvider: () => [indicator] })
        .scan({ asOf: '2026-01-02', roles: ['admin'] });

    assert.equal(coverage.items[0].status, 'COMPLETED');
    assert.equal(coverage.items[0].queue_eligible, false);
    assert.equal(coverage.items[0].queue_ineligible_reason, 'ALREADY_SUCCESS');
    assert.equal(coverage.runnable_portal_jobs, 0);
});

test('N-1 uses Asia/Ho_Chi_Minh and ordering is date, indicator priority, then lane priority', async () => {
    const policy = createMapPolicy();
    const indicators = [
        createIndicator({ code: 'F9.B', priority: 20, startDate: '2026-01-03', lanes: { HUE: createLane({ completionPolicy: policy }) } }),
        createIndicator({ code: 'F9.A', priority: 10, startDate: '2026-01-03', lanes: {
            HUE: createLane({ code: 'HUE', priority: 10, completionPolicy: policy }),
            TCT: createLane({ code: 'TCT', priority: 20, targetTable: 'fact_f9_tct', completionPolicy: policy }),
        } }),
    ];
    const service = new AutoBackfillCoverageService({
        db: {},
        clock: () => new Date('2026-01-03T18:30:00Z'),
        registryProvider: () => indicators,
    });
    const coverage = await service.scan({ roles: ['admin'] });

    assert.equal(coverage.as_of_business_date, '2026-01-04');
    assert.equal(coverage.to_date, '2026-01-03');
    assert.deepEqual(coverage.items.map((item) => `${item.indicator}|${item.source_lane}`), [
        'F9.A|HUE',
        'F9.A|TCT',
        'F9.B|HUE',
    ]);
});

test('registry-declared coverage permissions fail closed', async () => {
    const indicator = createIndicator({ lanes: { HUE: createLane({ completionPolicy: createMapPolicy() }) } });
    const service = new AutoBackfillCoverageService({ db: {}, registryProvider: () => [indicator] });

    await assert.rejects(
        service.scan({ asOf: '2026-01-02', roles: ['viewer'] }),
        (error) => error.code === 'COVERAGE_FORBIDDEN' && error.statusCode === 403,
    );
});

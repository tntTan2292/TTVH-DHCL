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
} = require('./src/services/importIndicatorRegistry');
const { createSqliteImportCompletionPolicy } = require('./src/services/autoBackfillCompletionPolicies');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const {
    AutoBackfillCoverageExceptionService,
    COVERAGE_EXCEPTION_TYPES,
} = require('./src/services/autoBackfillCoverageExceptionService');

const APPROVED_CIRCUIT_SCOPE = Object.freeze({
    dimensions: ['adapter', 'source', 'resource'],
    threshold: 5,
    sameSignatureConsecutive: true,
    integrityFailureStopsImmediately: true,
});

const VALID_ADAPTER_PROOF = Object.freeze({
    reportIdentityVerified: true,
    tupleMatchVerified: true,
    filterAppliedVerified: true,
    responseReadyVerified: true,
    structureValidZeroRows: true,
    reportIdentity: 'TEST_REPORT',
    confirmedRowCount: 0,
});

function createLane({
    code = 'HUE',
    priority = 10,
    targetTable = 'fact_f9_test',
    completionPolicy,
    automationMode = 'AUTOMATED',
    manualOnlyReason = null,
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
    processedDir = path.join(os.tmpdir(), 'qis-ab-coverage-exception-unused'),
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

async function createFixture() {
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
        CREATE TABLE fact_f9_hue (ngay_do_kiem TEXT NOT NULL, entity_id TEXT NOT NULL);
        CREATE TABLE fact_f9_tct (ngay_do_kiem TEXT NOT NULL, entity_id TEXT NOT NULL);

        CREATE TABLE auto_backfill_coverage_exception (
            id TEXT PRIMARY KEY,
            indicator TEXT NOT NULL,
            source_lane TEXT NOT NULL,
            business_date TEXT NOT NULL,
            exception_type TEXT NOT NULL CHECK (exception_type IN ('PO_EXEMPTED', 'LEGACY_BASELINE', 'VERIFIED_NO_DATA')),
            status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED')) DEFAULT 'ACTIVE',
            reason TEXT NOT NULL,
            evidence_json TEXT,
            registry_version TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            revoked_by TEXT,
            revoked_at TEXT,
            revoke_reason TEXT
        );
        CREATE UNIQUE INDEX uq_test_exception_active ON auto_backfill_coverage_exception(indicator, source_lane, business_date) WHERE status = 'ACTIVE';
        CREATE TRIGGER trg_test_exception_revoked_immutable BEFORE UPDATE ON auto_backfill_coverage_exception
            WHEN OLD.status = 'REVOKED' BEGIN SELECT RAISE(ABORT, 'revoked auto_backfill_coverage_exception is immutable'); END;
        CREATE TRIGGER trg_test_exception_no_delete BEFORE DELETE ON auto_backfill_coverage_exception
            BEGIN SELECT RAISE(ABORT, 'auto_backfill_coverage_exception cannot be deleted; revoke instead'); END;

        CREATE TABLE auto_backfill_coverage_exception_event (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exception_id TEXT NOT NULL,
            event_type TEXT NOT NULL CHECK (event_type IN ('CREATED', 'REVOKED')),
            exception_type TEXT NOT NULL,
            indicator TEXT NOT NULL,
            source_lane TEXT NOT NULL,
            business_date TEXT NOT NULL,
            reason TEXT,
            evidence_json TEXT,
            actor TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TRIGGER trg_test_exception_event_no_update BEFORE UPDATE ON auto_backfill_coverage_exception_event
            BEGIN SELECT RAISE(ABORT, 'auto_backfill_coverage_exception_event is append-only'); END;
        CREATE TRIGGER trg_test_exception_event_no_delete BEFORE DELETE ON auto_backfill_coverage_exception_event
            BEGIN SELECT RAISE(ABORT, 'auto_backfill_coverage_exception_event is append-only'); END;
    `);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ab-coverage-exception-'));
    const automatedPolicy = createSqliteImportCompletionPolicy({ id: 'F9_HUE_TEST_POLICY', distinctColumn: 'entity_id', expectedRowCount: 1 });
    const manualPolicy = createSqliteImportCompletionPolicy({ id: 'F9_TCT_TEST_POLICY', distinctColumn: 'entity_id', expectedRowCount: 1 });
    const indicator = createIndicator({
        priority: 10,
        processedDir: path.join(root, 'F9.TEST', 'Processed'),
        lanes: {
            HUE: createLane({ code: 'HUE', priority: 10, targetTable: 'fact_f9_hue', completionPolicy: automatedPolicy, automationMode: 'AUTOMATED' }),
            TCT: createLane({ code: 'TCT', priority: 20, targetTable: 'fact_f9_tct', completionPolicy: manualPolicy, automationMode: 'MANUAL_ONLY', manualOnlyReason: 'PORTAL_ADAPTER_NOT_REGISTERED' }),
        },
    });
    const clock = () => new Date('2026-01-05T12:00:00Z');
    return { db, root, indicator, clock };
}

function createServices(fixture) {
    const registryProvider = () => [fixture.indicator];
    const exceptionService = new AutoBackfillCoverageExceptionService({ db: fixture.db, clock: fixture.clock, registryProvider });
    const coverageService = new AutoBackfillCoverageService({ db: fixture.db, clock: fixture.clock, registryProvider, exceptionService });
    return { exceptionService, coverageService };
}

async function teardown(fixture) {
    await fixture.db.close();
    fs.rmSync(fixture.root, { recursive: true, force: true });
}

test('AB-EXT extensibility: exception service source has no F1.3/F4.1 branch', () => {
    const source = fs.readFileSync(path.join(__dirname, 'src/services/autoBackfillCoverageExceptionService.js'), 'utf8');
    assert.doesNotMatch(source, /F1\.3|F4\.1|fact_f1|fact_f4/i);
});

test('VERIFIED_NO_DATA is rejected when any of the 5 adapter-proof criteria is missing', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'VERIFIED_NO_DATA', reason: 'Portal xac nhan 0 dong',
                evidence: { ...VALID_ADAPTER_PROOF, structureValidZeroRows: false },
                actor: 'admin-1',
            }),
            (error) => error.code === 'VERIFIED_NO_DATA_PROOF_INCOMPLETE' && error.statusCode === 422,
        );
    } finally {
        await teardown(fixture);
    }
});

test('VERIFIED_NO_DATA is rejected when reportIdentity does not match the declared adapter', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'VERIFIED_NO_DATA', reason: 'Portal xac nhan 0 dong',
                evidence: { ...VALID_ADAPTER_PROOF, reportIdentity: 'WRONG_REPORT' },
                actor: 'admin-1',
            }),
            (error) => error.code === 'VERIFIED_NO_DATA_REPORT_IDENTITY_MISMATCH',
        );
    } finally {
        await teardown(fixture);
    }
});

test('VERIFIED_NO_DATA is rejected when confirmedRowCount is not exactly 0', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'VERIFIED_NO_DATA', reason: 'Portal xac nhan 0 dong',
                evidence: { ...VALID_ADAPTER_PROOF, confirmedRowCount: 3 },
                actor: 'admin-1',
            }),
            (error) => error.code === 'VERIFIED_NO_DATA_ROW_COUNT_NOT_ZERO',
        );
    } finally {
        await teardown(fixture);
    }
});

test('VERIFIED_NO_DATA is rejected for a MANUAL_ONLY lane with no registered Portal adapter', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'TCT', businessDate: '2026-01-03',
                exceptionType: 'VERIFIED_NO_DATA', reason: 'Portal xac nhan 0 dong',
                evidence: VALID_ADAPTER_PROOF,
                actor: 'admin-1',
            }),
            (error) => error.code === 'VERIFIED_NO_DATA_REQUIRES_PORTAL_ADAPTER',
        );
    } finally {
        await teardown(fixture);
    }
});

test('VERIFIED_NO_DATA is rejected when committed data already exists for the tuple', async () => {
    const fixture = await createFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f9_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-03', 'X-1')");
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'VERIFIED_NO_DATA', reason: 'Portal xac nhan 0 dong',
                evidence: VALID_ADAPTER_PROOF,
                actor: 'admin-1',
            }),
            (error) => error.code === 'VERIFIED_NO_DATA_REQUIRES_NO_COMMITTED_DATA',
        );
    } finally {
        await teardown(fixture);
    }
});

test('VERIFIED_NO_DATA is accepted with all 5 criteria proven and overlays coverage as queue-ineligible', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService, coverageService } = createServices(fixture);
        const record = await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'VERIFIED_NO_DATA', reason: 'Portal xac nhan 0 dong',
            evidence: VALID_ADAPTER_PROOF,
            actor: 'admin-1',
        });
        assert.equal(record.exception_type, 'VERIFIED_NO_DATA');
        assert.equal(record.status, 'ACTIVE');
        assert.equal(record.events.length, 1);
        assert.equal(record.events[0].event_type, 'CREATED');

        const coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        const item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'VERIFIED_NO_DATA');
        assert.equal(item.queue_eligible, false);
        assert.equal(item.queue_ineligible_reason, 'VERIFIED_NO_DATA');
    } finally {
        await teardown(fixture);
    }
});

test('LEGACY_BASELINE is rejected when there is no committed data to reconcile', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'LEGACY_BASELINE', reason: 'Du lieu cu truoc khi co Import',
                actor: 'admin-1',
            }),
            (error) => error.code === 'LEGACY_BASELINE_REQUIRES_COMMITTED_DATA_WITHOUT_EVIDENCE',
        );
    } finally {
        await teardown(fixture);
    }
});

test('LEGACY_BASELINE is accepted when committed rows exist without complete import evidence', async () => {
    const fixture = await createFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f9_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-03', 'X-1')");
        const { exceptionService, coverageService } = createServices(fixture);
        const record = await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'LEGACY_BASELINE', reason: 'Du lieu cu truoc khi co Import',
            actor: 'admin-1',
        });
        assert.equal(record.exception_type, 'LEGACY_BASELINE');

        const coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        const item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'LEGACY_BASELINE');
        assert.equal(item.queue_eligible, false);
    } finally {
        await teardown(fixture);
    }
});

test('PO_EXEMPTED requires a non-empty reason', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'PO_EXEMPTED', reason: '   ',
                actor: 'admin-1',
            }),
            (error) => error.code === 'COVERAGE_EXCEPTION_REASON_REQUIRED',
        );
    } finally {
        await teardown(fixture);
    }
});

test('PO_EXEMPTED cannot be recorded over already-complete evidence', async () => {
    const fixture = await createFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f9_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-03', 'X-1')");
        await fixture.db.run("INSERT INTO import_log (indicator, source_lane, ngay_do_kiem, status) VALUES ('F9.TEST', 'HUE', '2026-01-03', 'SUCCESS')");
        fs.mkdirSync(path.join(fixture.indicator.processedDir, 'HUE'), { recursive: true });
        fs.writeFileSync(path.join(fixture.indicator.processedDir, 'HUE', fixture.indicator.filenameDateRule.format('2026-01-03')), 'artifact');
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'PO_EXEMPTED', reason: 'Khong can thiet',
                actor: 'admin-1',
            }),
            (error) => error.code === 'PO_EXEMPTED_NOT_APPLICABLE_TO_COMPLETE_DATA',
        );
    } finally {
        await teardown(fixture);
    }
});

test('PO_EXEMPTED is accepted, audited, overlays coverage, and is reversible', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService, coverageService } = createServices(fixture);
        const created = await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'PO_EXEMPTED', reason: 'Ngay le, khong phat sinh nghiep vu',
            actor: 'po-user',
        });
        assert.equal(created.exception_type, 'PO_EXEMPTED');
        assert.equal(created.status, 'ACTIVE');

        let coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        let item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'PO_EXEMPTED');
        assert.equal(item.queue_eligible, false);
        assert.equal(item.exception.reason, 'Ngay le, khong phat sinh nghiep vu');

        const revoked = await exceptionService.revoke({ exceptionId: created.id, reason: 'PO doi y', actor: 'po-user' });
        assert.equal(revoked.status, 'REVOKED');
        assert.equal(revoked.revoke_reason, 'PO doi y');
        assert.equal(revoked.events.length, 2);
        assert.equal(revoked.events[1].event_type, 'REVOKED');

        coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'TRUE_MISSING');
        assert.equal(item.queue_eligible, true);
    } finally {
        await teardown(fixture);
    }
});

test('revoking twice is rejected and a revoked exception row cannot be mutated again at the DB layer', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        const created = await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'PO_EXEMPTED', reason: 'Ly do 1', actor: 'po-user',
        });
        await exceptionService.revoke({ exceptionId: created.id, reason: 'Huy lan 1', actor: 'po-user' });
        await assert.rejects(
            exceptionService.revoke({ exceptionId: created.id, reason: 'Huy lan 2', actor: 'po-user' }),
            (error) => error.code === 'COVERAGE_EXCEPTION_NOT_ACTIVE' && error.statusCode === 409,
        );
        await assert.rejects(
            fixture.db.run("UPDATE auto_backfill_coverage_exception SET reason = 'tampered' WHERE id = ?", [created.id]),
            /immutable/,
        );
    } finally {
        await teardown(fixture);
    }
});

test('a second active exception cannot be recorded over an already-active one for the same tuple', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'PO_EXEMPTED', reason: 'Ly do 1', actor: 'po-user',
        });
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'PO_EXEMPTED', reason: 'Ly do 2', actor: 'po-user',
            }),
            (error) => error.code === 'COVERAGE_EXCEPTION_ALREADY_ACTIVE' && error.statusCode === 409,
        );
    } finally {
        await teardown(fixture);
    }
});

test('coverage exception rows can never be hard-deleted at the DB layer', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        const created = await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'PO_EXEMPTED', reason: 'Ly do 1', actor: 'po-user',
        });
        await assert.rejects(
            fixture.db.run('DELETE FROM auto_backfill_coverage_exception WHERE id = ?', [created.id]),
            /cannot be deleted/,
        );
    } finally {
        await teardown(fixture);
    }
});

test('TRUE_MISSING items on an automated lane with no exception remain queue eligible', async () => {
    const fixture = await createFixture();
    try {
        const { coverageService } = createServices(fixture);
        const coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        const item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'TRUE_MISSING');
        assert.equal(item.queue_eligible, true);
    } finally {
        await teardown(fixture);
    }
});

test('coverage exception access is registry-role-gated and fails closed', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await assert.rejects(
            exceptionService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'PO_EXEMPTED', reason: 'Ly do', actor: 'viewer-1', roles: ['viewer'],
            }),
            (error) => error.code === 'COVERAGE_EXCEPTION_FORBIDDEN' && error.statusCode === 403,
        );
    } finally {
        await teardown(fixture);
    }
});

test('list filters by indicator, lane, business_date and status', async () => {
    const fixture = await createFixture();
    try {
        const { exceptionService } = createServices(fixture);
        await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'PO_EXEMPTED', reason: 'Ly do', actor: 'po-user',
        });
        const active = await exceptionService.list({ indicator: 'F9.TEST', lane: 'HUE', status: 'ACTIVE', roles: ['admin'] });
        assert.equal(active.total, 1);
        const revoked = await exceptionService.list({ indicator: 'F9.TEST', lane: 'HUE', status: 'REVOKED', roles: ['admin'] });
        assert.equal(revoked.total, 0);
    } finally {
        await teardown(fixture);
    }
});

test('an unrelated F1.3-shaped registration proves exception logic contains no indicator branch', async () => {
    const fixture = await createFixture();
    try {
        const registryProvider = () => [{
            ...fixture.indicator,
            code: 'F5.TEST',
            lanes: { HUE: fixture.indicator.lanes.HUE },
        }];
        const exceptionService = new AutoBackfillCoverageExceptionService({ db: fixture.db, clock: fixture.clock, registryProvider });
        const record = await exceptionService.create({
            indicator: 'F5.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'VERIFIED_NO_DATA', reason: 'Portal xac nhan 0 dong',
            evidence: VALID_ADAPTER_PROOF, actor: 'admin-1',
        });
        assert.equal(record.indicator, 'F5.TEST');
    } finally {
        await teardown(fixture);
    }
});

test('exports the canonical exception type constants', () => {
    assert.deepEqual(Object.values(COVERAGE_EXCEPTION_TYPES).sort(), ['LEGACY_BASELINE', 'PO_EXEMPTED', 'VERIFIED_NO_DATA'].sort());
});

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

// Wraps a real db handle so a specific SQL statement (matched by a substring
// unique to it) fails, while every other statement -- including
// BEGIN/COMMIT/ROLLBACK and reads -- passes through to the real connection
// untouched. Used to prove the create/revoke transaction actually rolls back
// when the mandatory append-only event write fails.
function createFlakyDb(realDb, failOnSqlIncludes) {
    return {
        get: (...args) => realDb.get(...args),
        all: (...args) => realDb.all(...args),
        run: (sql, params) => {
            if (sql.includes(failOnSqlIncludes)) {
                return Promise.reject(new Error('INJECTED_FAULT: simulated write failure'));
            }
            return realDb.run(sql, params);
        },
    };
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
        assert.equal(item.status, 'EXCLUDED');
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

test('LEGACY_BASELINE is accepted when committed rows exist without complete import evidence, and PO policy D2 reads it as COMPLETED', async () => {
    const fixture = await createFixture();
    try {
        // PO policy: a single committed row with no log/artifact is now SUCCESS
        // on its own (data presence is sufficient), so this scenario needs a
        // genuine integrity mismatch (rowCount != expectedRowCount, which is 1
        // for this fixture's policy) to still land on MANUAL_REVIEW_REQUIRED,
        // the only raw status LEGACY_BASELINE is allowed to overlay.
        await fixture.db.run("INSERT INTO fact_f9_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-03', 'X-1')");
        await fixture.db.run("INSERT INTO fact_f9_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-03', 'X-2')");
        const { exceptionService, coverageService } = createServices(fixture);
        const record = await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'LEGACY_BASELINE', reason: 'Du lieu cu truoc khi co Import',
            actor: 'admin-1',
        });
        assert.equal(record.exception_type, 'LEGACY_BASELINE');

        // AB-CALENDAR-01 D2 (approved): valid data present = Đã hoàn tất -- a
        // LEGACY_BASELINE day with committed rows reads COMPLETED, never EXCLUDED.
        const coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        const item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'COMPLETED');
        assert.equal(item.queue_eligible, false);
    } finally {
        await teardown(fixture);
    }
});

test('AB-CALENDAR-01 D2 guard: a stale LEGACY_BASELINE (data since removed) falls through to INCOMPLETE, never COMPLETED', async () => {
    const fixture = await createFixture();
    try {
        await fixture.db.run("INSERT INTO fact_f9_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-03', 'X-1')");
        await fixture.db.run("INSERT INTO fact_f9_hue (ngay_do_kiem, entity_id) VALUES ('2026-01-03', 'X-2')");
        const { exceptionService, coverageService } = createServices(fixture);
        await exceptionService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'LEGACY_BASELINE', reason: 'Du lieu cu truoc khi co Import',
            actor: 'admin-1',
        });

        // The rows this exception vouched for are gone, but the exception record
        // (correctly) stays ACTIVE -- nothing revoked it. The mapping must not
        // trust a stale record: it falls through to the normal raw-status mapping.
        await fixture.db.run("DELETE FROM fact_f9_hue WHERE ngay_do_kiem = '2026-01-03'");

        const coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        const item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'INCOMPLETE', 'stale LEGACY_BASELINE with no data present must never claim COMPLETED');
        assert.equal(item.queue_eligible, false, 'the exception row is still ACTIVE, so queueDisposition still holds it back');
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
        assert.equal(item.status, 'EXCLUDED');
        assert.equal(item.queue_eligible, false);
        assert.equal(item.exception.reason, 'Ngay le, khong phat sinh nghiep vu');

        const revoked = await exceptionService.revoke({ exceptionId: created.id, reason: 'PO doi y', actor: 'po-user' });
        assert.equal(revoked.status, 'REVOKED');
        assert.equal(revoked.revoke_reason, 'PO doi y');
        assert.equal(revoked.events.length, 2);
        assert.equal(revoked.events[1].event_type, 'REVOKED');

        coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'INCOMPLETE');
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

test('INCOMPLETE items on an automated lane with no exception remain queue eligible', async () => {
    const fixture = await createFixture();
    try {
        const { coverageService } = createServices(fixture);
        const coverage = await coverageService.scan({ lane: 'HUE', roles: ['admin'] });
        const item = coverage.items.find((entry) => entry.business_date === '2026-01-03');
        assert.equal(item.status, 'INCOMPLETE');
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

test('fault injection: create() rolls back the state row when the append-only event write fails', async () => {
    const fixture = await createFixture();
    try {
        const registryProvider = () => [fixture.indicator];
        const flakyService = new AutoBackfillCoverageExceptionService({
            db: createFlakyDb(fixture.db, 'auto_backfill_coverage_exception_event'),
            clock: fixture.clock, registryProvider,
        });

        await assert.rejects(
            flakyService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'PO_EXEMPTED', reason: 'Ly do', actor: 'po-user',
            }),
            /INJECTED_FAULT/,
        );

        const rows = await fixture.db.all('SELECT * FROM auto_backfill_coverage_exception');
        assert.equal(rows.length, 0, 'no partial exception row must remain after a failed event write');
        const events = await fixture.db.all('SELECT * FROM auto_backfill_coverage_exception_event');
        assert.equal(events.length, 0, 'no event can exist without its exception row either');

        // The tuple must still be creatable afterwards (no dangling UNIQUE-index lock).
        const realService = new AutoBackfillCoverageExceptionService({ db: fixture.db, clock: fixture.clock, registryProvider });
        const record = await realService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'PO_EXEMPTED', reason: 'Ly do sau khi rollback', actor: 'po-user',
        });
        assert.equal(record.status, 'ACTIVE');
    } finally {
        await teardown(fixture);
    }
});

test('fault injection: create() rolls back cleanly when the state write itself fails', async () => {
    const fixture = await createFixture();
    try {
        const registryProvider = () => [fixture.indicator];
        const flakyService = new AutoBackfillCoverageExceptionService({
            db: createFlakyDb(fixture.db, "exception_type, status, reason, evidence_json, registry_version"),
            clock: fixture.clock, registryProvider,
        });

        await assert.rejects(
            flakyService.create({
                indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
                exceptionType: 'PO_EXEMPTED', reason: 'Ly do', actor: 'po-user',
            }),
            /INJECTED_FAULT/,
        );

        const rows = await fixture.db.all('SELECT * FROM auto_backfill_coverage_exception');
        assert.equal(rows.length, 0);
        const events = await fixture.db.all('SELECT * FROM auto_backfill_coverage_exception_event');
        assert.equal(events.length, 0, 'the event write must never be reached, let alone persisted, once the state write fails');
    } finally {
        await teardown(fixture);
    }
});

test('fault injection: revoke() rolls back the status change when the append-only event write fails', async () => {
    const fixture = await createFixture();
    try {
        const registryProvider = () => [fixture.indicator];
        const realService = new AutoBackfillCoverageExceptionService({ db: fixture.db, clock: fixture.clock, registryProvider });
        const created = await realService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'PO_EXEMPTED', reason: 'Ly do', actor: 'po-user',
        });

        const flakyService = new AutoBackfillCoverageExceptionService({
            db: createFlakyDb(fixture.db, 'auto_backfill_coverage_exception_event'),
            clock: fixture.clock, registryProvider,
        });
        await assert.rejects(
            flakyService.revoke({ exceptionId: created.id, reason: 'Huy bo', actor: 'po-user' }),
            /INJECTED_FAULT/,
        );

        const row = await fixture.db.get('SELECT * FROM auto_backfill_coverage_exception WHERE id = ?', [created.id]);
        assert.equal(row.status, 'ACTIVE', 'status must remain ACTIVE; it must never be REVOKED without its audit event');
        assert.equal(row.revoked_by, null);
        assert.equal(row.revoked_at, null);
        const events = await fixture.db.all("SELECT * FROM auto_backfill_coverage_exception_event WHERE exception_id = ? AND event_type = 'REVOKED'", [created.id]);
        assert.equal(events.length, 0, 'no REVOKED event can exist without the status actually changing');

        // The exception must still be genuinely revocable afterwards.
        const revoked = await realService.revoke({ exceptionId: created.id, reason: 'Huy bo lai', actor: 'po-user' });
        assert.equal(revoked.status, 'REVOKED');
    } finally {
        await teardown(fixture);
    }
});

test('fault injection: revoke() rolls back cleanly when the status-update write itself fails', async () => {
    const fixture = await createFixture();
    try {
        const registryProvider = () => [fixture.indicator];
        const realService = new AutoBackfillCoverageExceptionService({ db: fixture.db, clock: fixture.clock, registryProvider });
        const created = await realService.create({
            indicator: 'F9.TEST', lane: 'HUE', businessDate: '2026-01-03',
            exceptionType: 'PO_EXEMPTED', reason: 'Ly do', actor: 'po-user',
        });

        const flakyService = new AutoBackfillCoverageExceptionService({
            db: createFlakyDb(fixture.db, "SET status = 'REVOKED'"),
            clock: fixture.clock, registryProvider,
        });
        await assert.rejects(
            flakyService.revoke({ exceptionId: created.id, reason: 'Huy bo', actor: 'po-user' }),
            /INJECTED_FAULT/,
        );

        const row = await fixture.db.get('SELECT * FROM auto_backfill_coverage_exception WHERE id = ?', [created.id]);
        assert.equal(row.status, 'ACTIVE');
        const events = await fixture.db.all("SELECT * FROM auto_backfill_coverage_exception_event WHERE exception_id = ? AND event_type = 'REVOKED'", [created.id]);
        assert.equal(events.length, 0, 'the event write must never be reached once the status-update write fails');
    } finally {
        await teardown(fixture);
    }
});

'use strict';

/**
 * Focused remediation tests for the reuse risk identified in commit
 * `0fdecd58`'s review: this script must never be able to migrate any ACTIVE
 * exception outside the exact, immutable 8-id allowlist it was reviewed
 * against, must default to read-only, and must require an exact
 * confirmation token to write at all.
 *
 * All tests run against an isolated in-memory SQLite database. None of them
 * touch the live database.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3').verbose();

const {
    plan,
    migrate,
    isWriteConfirmed,
    APPROVED_MIGRATION,
    REQUIRED_CONFIRMATION_TOKEN,
} = require('./migrate_ab_calendar_01_exceptions_to_holidays');
const { AUTO_BACKFILL_HOLIDAY_CALENDAR_SCHEMA_SQL } = require('../migrate_auto_backfill_holiday_calendar_schema');

const EXCEPTION_TABLES_SQL = `
CREATE TABLE auto_backfill_coverage_exception (
    id TEXT PRIMARY KEY, indicator TEXT NOT NULL, source_lane TEXT NOT NULL, business_date TEXT NOT NULL,
    exception_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', reason TEXT NOT NULL, evidence_json TEXT,
    registry_version TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
    revoked_by TEXT, revoked_at TEXT, revoke_reason TEXT
);
CREATE TABLE auto_backfill_coverage_exception_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT, exception_id TEXT NOT NULL, event_type TEXT NOT NULL, exception_type TEXT NOT NULL,
    indicator TEXT NOT NULL, source_lane TEXT NOT NULL, business_date TEXT NOT NULL, reason TEXT, evidence_json TEXT,
    actor TEXT NOT NULL, created_at TEXT NOT NULL
);
`;

function createMemoryDb() {
    const raw = new sqlite3.Database(':memory:');
    return {
        run(sql, params = []) {
            return new Promise((resolve, reject) => raw.run(sql, params, function onRun(error) {
                if (error) reject(error);
                else resolve(this);
            }));
        },
        get(sql, params = []) {
            return new Promise((resolve, reject) => raw.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
        },
        all(sql, params = []) {
            return new Promise((resolve, reject) => raw.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
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
    await db.exec(AUTO_BACKFILL_HOLIDAY_CALENDAR_SCHEMA_SQL);
    await db.exec(EXCEPTION_TABLES_SQL);
    return db;
}

const insertException = (db, { id, indicator, source_lane, business_date, reason = 'reason' }) => db.run(`
    INSERT INTO auto_backfill_coverage_exception
        (id, indicator, source_lane, business_date, exception_type, status, reason, registry_version, created_by, created_at)
    VALUES (?, ?, ?, ?, 'PO_EXEMPTED', 'ACTIVE', ?, 'test', 'admin', ?)
`, [id, indicator, source_lane, business_date, reason, new Date().toISOString()]);

async function insertApprovedSet(db) {
    for (const row of APPROVED_MIGRATION) {
        await insertException(db, { ...row, reason: `original reason for ${row.business_date}` });
    }
}

const activeExceptionIds = async (db) => (await db.all(
    "SELECT id FROM auto_backfill_coverage_exception WHERE status = 'ACTIVE'",
)).map((row) => row.id);

const activeHolidayDates = async (db) => (await db.all(
    "SELECT business_date FROM auto_backfill_holiday_calendar WHERE status = 'ACTIVE'",
)).map((row) => row.business_date);

// --------------------------------------------------------------------------
// isWriteConfirmed -- the exact-token gate
// --------------------------------------------------------------------------

test('REM-01 isWriteConfirmed requires the exact token, not a bare flag or a wrong value', () => {
    assert.equal(isWriteConfirmed([]), false);
    assert.equal(isWriteConfirmed(['--confirm-write']), false);
    assert.equal(isWriteConfirmed(['--confirm-write=']), false);
    assert.equal(isWriteConfirmed(['--confirm-write=yes']), false);
    assert.equal(isWriteConfirmed(['--confirm-write=AB-CALENDAR-01-APPROVED-9']), false);
    assert.equal(isWriteConfirmed([`--confirm-write=${REQUIRED_CONFIRMATION_TOKEN}`]), true);
});

// --------------------------------------------------------------------------
// Default (read-only) behavior
// --------------------------------------------------------------------------

test('REM-02 with the approved 8 still ACTIVE, plan() reports READY but performs no write on its own', async () => {
    const db = await createFixture();
    try {
        await insertApprovedSet(db);
        const before = await activeExceptionIds(db);

        const result = await plan(db);
        assert.equal(result.status, 'READY');
        assert.equal(result.eligible.length, 8);

        // plan() is read-only by construction: it only ever SELECTs.
        const after = await activeExceptionIds(db);
        assert.deepEqual(new Set(after), new Set(before));
        assert.equal((await activeHolidayDates(db)).length, 0);
    } finally {
        await db.close();
    }
});

test('REM-03 an unexpected ACTIVE exception blocks the plan entirely, even though 8 approved rows are also present', async () => {
    const db = await createFixture();
    try {
        await insertApprovedSet(db);
        await insertException(db, { id: 'brand-new-po-exception', indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-05-01', reason: 'unrelated future PO decision' });

        const result = await plan(db);
        assert.equal(result.status, 'ABORTED_UNEXPECTED_ACTIVE_EXCEPTION');
        assert.deepEqual(result.unexpected.map((row) => row.id), ['brand-new-po-exception']);

        // Nothing was written, and the unrelated exception is untouched.
        assert.equal((await activeExceptionIds(db)).length, 9);
        assert.equal((await activeHolidayDates(db)).length, 0);
        const stillActive = await db.get("SELECT status FROM auto_backfill_coverage_exception WHERE id = 'brand-new-po-exception'");
        assert.equal(stillActive.status, 'ACTIVE');
    } finally {
        await db.close();
    }
});

test('REM-04 an unexpected ACTIVE exception alone (none of the approved 8 present) also aborts, never migrates it', async () => {
    const db = await createFixture();
    try {
        await insertException(db, { id: 'some-other-po-exception', indicator: 'F4.1', source_lane: 'TCT', business_date: '2026-06-15', reason: 'a real, current PO exemption' });

        const result = await plan(db);
        assert.equal(result.status, 'ABORTED_UNEXPECTED_ACTIVE_EXCEPTION');
        assert.equal((await activeHolidayDates(db)).length, 0);
    } finally {
        await db.close();
    }
});

// --------------------------------------------------------------------------
// Write path -- only ever the allowlist, only ever with the exact token
// --------------------------------------------------------------------------

test('REM-05 migrate() only ever writes the eligible (allowlisted) rows it is handed', async () => {
    const db = await createFixture();
    try {
        await insertApprovedSet(db);
        const { eligible } = await require('./migrate_ab_calendar_01_exceptions_to_holidays').classify(db);
        assert.equal(eligible.length, 8);

        const result = await migrate({ db, eligible });
        assert.equal(result.exceptionsRevoked.length, 8);
        assert.equal(new Set(result.holidaysCreated.map((h) => h.business_date)).size, 6);

        assert.equal((await activeExceptionIds(db)).length, 0);
        assert.deepEqual((await activeHolidayDates(db)).sort(), [...new Set(APPROVED_MIGRATION.map((row) => row.business_date))].sort());
    } finally {
        await db.close();
    }
});

test('REM-06 after a completed migration, a full read-plan-then-write pass returns NOOP and writes nothing further', async () => {
    const db = await createFixture();
    try {
        await insertApprovedSet(db);
        const { eligible } = await require('./migrate_ab_calendar_01_exceptions_to_holidays').classify(db);
        await migrate({ db, eligible }); // simulates the already-completed 2026-08-27 run

        const holidayCountBefore = (await activeHolidayDates(db)).length;
        const result = await plan(db);
        assert.equal(result.status, 'NOOP');

        // A second "invocation" (plan + would-be write) changes nothing.
        assert.equal((await activeHolidayDates(db)).length, holidayCountBefore);
        assert.equal((await activeExceptionIds(db)).length, 0);
    } finally {
        await db.close();
    }
});

test('REM-07 after a completed migration, a NEW unrelated ACTIVE exception still blocks the script (never touched, never migrated)', async () => {
    const db = await createFixture();
    try {
        await insertApprovedSet(db);
        const { eligible } = await require('./migrate_ab_calendar_01_exceptions_to_holidays').classify(db);
        await migrate({ db, eligible });

        // Time passes; PO records a brand-new, entirely unrelated exception
        // through the normal API, long after this script's approved batch.
        await insertException(db, { id: 'future-po-exception-2026-09', indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-09-10', reason: 'a real new PO decision, never reviewed by this script' });

        const result = await plan(db);
        assert.equal(result.status, 'ABORTED_UNEXPECTED_ACTIVE_EXCEPTION');
        assert.deepEqual(result.unexpected.map((row) => row.id), ['future-po-exception-2026-09']);

        const stillActive = await db.get("SELECT status FROM auto_backfill_coverage_exception WHERE id = 'future-po-exception-2026-09'");
        assert.equal(stillActive.status, 'ACTIVE', 'a future exception must never be silently migrated by a rerun of this script');
        assert.equal((await activeHolidayDates(db)).length, 6, 'no additional holiday must be created for the future exception');
    } finally {
        await db.close();
    }
});

test('REM-08 an allowlisted id whose current row no longer matches the approved indicator/lane/date aborts as a mismatch', async () => {
    const db = await createFixture();
    try {
        // Same id as an approved row, but a different lane than what was
        // approved -- structurally shouldn't happen, defended anyway.
        const approved = APPROVED_MIGRATION[0];
        await insertException(db, { id: approved.id, indicator: approved.indicator, source_lane: 'TCT', business_date: approved.business_date });

        const result = await plan(db);
        assert.equal(result.status, 'ABORTED_ALLOWLIST_MISMATCH');
        assert.equal(result.mismatched[0].id, approved.id);
        assert.equal((await activeHolidayDates(db)).length, 0);
    } finally {
        await db.close();
    }
});

test('REM-09 an ACTIVE holiday already present for an approved date aborts before any write', async () => {
    const db = await createFixture();
    try {
        await insertApprovedSet(db);
        await db.run(`
            INSERT INTO auto_backfill_holiday_calendar (id, business_date, reason, status, created_by, created_at)
            VALUES ('preexisting-holiday', '2026-02-17', 'created independently', 'ACTIVE', 'someone-else', ?)
        `, [new Date().toISOString()]);

        const result = await plan(db);
        assert.equal(result.status, 'ABORTED_HOLIDAY_CONFLICT');
        assert.equal(result.conflicts[0].businessDate, '2026-02-17');

        // The other 5 approved dates must not have been migrated either --
        // the whole batch aborts together, not partially.
        assert.equal((await activeExceptionIds(db)).length, 8);
    } finally {
        await db.close();
    }
});

test('REM-10 the allowlist is exactly 8 rows across 6 distinct dates, matching the 2026-08-27 PO-approved migration', () => {
    assert.equal(APPROVED_MIGRATION.length, 8);
    const dates = new Set(APPROVED_MIGRATION.map((row) => row.business_date));
    assert.equal(dates.size, 6);
    assert.ok(APPROVED_MIGRATION.every((row) => row.indicator === 'F1.3'));
    // ids must be unique -- a duplicate would silently shrink the allowlist.
    assert.equal(new Set(APPROVED_MIGRATION.map((row) => row.id)).size, 8);
});

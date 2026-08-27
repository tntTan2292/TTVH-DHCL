/**
 * AB-CALENDAR-01 -- LỊCH NGHỈ (holiday calendar) persistence.
 *
 * Additive, indicator-agnostic and audited. A holiday is a *scheduling* fact
 * ("no operations were expected on this day"), never a *data-verification*
 * fact -- it is deliberately kept out of `auto_backfill_coverage_exception`
 * so it can never satisfy a coverage-exception audit or the VERIFIED_NO_DATA
 * 5-point adapter proof (design Section 7, R3).
 *
 * Persistence follows the coverage-exception precedent exactly: revoke rather
 * than delete, a partial unique index on the ACTIVE row, and an append-only
 * event ledger.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const AUTO_BACKFILL_HOLIDAY_CALENDAR_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auto_backfill_holiday_calendar (
    id TEXT PRIMARY KEY,
    business_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED')) DEFAULT 'ACTIVE',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked_by TEXT,
    revoked_at TEXT,
    revoke_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auto_backfill_holiday_calendar_active
    ON auto_backfill_holiday_calendar(business_date)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_auto_backfill_holiday_calendar_scope
    ON auto_backfill_holiday_calendar(status, business_date);

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_holiday_calendar_no_delete
BEFORE DELETE ON auto_backfill_holiday_calendar
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_holiday_calendar cannot be deleted; revoke instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_holiday_calendar_revoked_immutable
BEFORE UPDATE ON auto_backfill_holiday_calendar
WHEN OLD.status = 'REVOKED'
BEGIN
    SELECT RAISE(ABORT, 'revoked auto_backfill_holiday_calendar is immutable');
END;

CREATE TABLE IF NOT EXISTS auto_backfill_holiday_calendar_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holiday_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('CREATED', 'REVOKED')),
    business_date TEXT NOT NULL,
    reason TEXT,
    actor TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(holiday_id) REFERENCES auto_backfill_holiday_calendar(id)
);

CREATE INDEX IF NOT EXISTS idx_auto_backfill_holiday_calendar_event_holiday
    ON auto_backfill_holiday_calendar_event(holiday_id, id);

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_holiday_calendar_event_no_update
BEFORE UPDATE ON auto_backfill_holiday_calendar_event
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_holiday_calendar_event is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_holiday_calendar_event_no_delete
BEFORE DELETE ON auto_backfill_holiday_calendar_event
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_holiday_calendar_event is append-only');
END;
`;

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (error) => error ? reject(error) : resolve(db));
    });
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => error ? reject(error) : resolve()));
}

function closeDb(db) {
    return new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

async function applyAutoBackfillHolidayCalendarSchema(dbPath) {
    const db = await openDb(dbPath);
    try {
        await exec(db, 'PRAGMA foreign_keys=ON');
        await exec(db, AUTO_BACKFILL_HOLIDAY_CALENDAR_SCHEMA_SQL);
        return { table: 'auto_backfill_holiday_calendar' };
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    applyAutoBackfillHolidayCalendarSchema(resolveDbPath(process.argv.slice(2)))
        .then(() => console.log('[OK] AB-CALENDAR-01 holiday calendar schema present. No queue or business data was inserted.'))
        .catch((error) => {
            console.error('[FAIL] AB-CALENDAR-01 migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyAutoBackfillHolidayCalendarSchema,
    AUTO_BACKFILL_HOLIDAY_CALENDAR_SCHEMA_SQL,
};

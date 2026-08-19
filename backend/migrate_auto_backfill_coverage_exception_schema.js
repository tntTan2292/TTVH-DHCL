/**
 * AUTO-BACKFILL-COVERAGE-EXCEPTION - additive, controlled and audited
 * coverage-exception persistence (PO_EXEMPTED, LEGACY_BASELINE, VERIFIED_NO_DATA).
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const AUTO_BACKFILL_COVERAGE_EXCEPTION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auto_backfill_coverage_exception (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_auto_backfill_coverage_exception_active
    ON auto_backfill_coverage_exception(indicator, source_lane, business_date)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_auto_backfill_coverage_exception_scope
    ON auto_backfill_coverage_exception(indicator, source_lane, status);

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_coverage_exception_no_delete
BEFORE DELETE ON auto_backfill_coverage_exception
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_coverage_exception cannot be deleted; revoke instead');
END;

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_coverage_exception_revoked_immutable
BEFORE UPDATE ON auto_backfill_coverage_exception
WHEN OLD.status = 'REVOKED'
BEGIN
    SELECT RAISE(ABORT, 'revoked auto_backfill_coverage_exception is immutable');
END;

CREATE TABLE IF NOT EXISTS auto_backfill_coverage_exception_event (
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
    created_at TEXT NOT NULL,
    FOREIGN KEY(exception_id) REFERENCES auto_backfill_coverage_exception(id)
);

CREATE INDEX IF NOT EXISTS idx_auto_backfill_coverage_exception_event_exception
    ON auto_backfill_coverage_exception_event(exception_id, id);

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_coverage_exception_event_no_update
BEFORE UPDATE ON auto_backfill_coverage_exception_event
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_coverage_exception_event is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_coverage_exception_event_no_delete
BEFORE DELETE ON auto_backfill_coverage_exception_event
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_coverage_exception_event is append-only');
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

async function applyAutoBackfillCoverageExceptionSchema(dbPath) {
    const db = await openDb(dbPath);
    try {
        await exec(db, 'PRAGMA foreign_keys=ON');
        await exec(db, AUTO_BACKFILL_COVERAGE_EXCEPTION_SCHEMA_SQL);
        return { table: 'auto_backfill_coverage_exception' };
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    applyAutoBackfillCoverageExceptionSchema(resolveDbPath(process.argv.slice(2)))
        .then(() => console.log('[OK] AUTO-BACKFILL-COVERAGE-EXCEPTION schema present. No queue or business data was inserted.'))
        .catch((error) => {
            console.error('[FAIL] AUTO-BACKFILL-COVERAGE-EXCEPTION migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyAutoBackfillCoverageExceptionSchema,
    AUTO_BACKFILL_COVERAGE_EXCEPTION_SCHEMA_SQL,
};

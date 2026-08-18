/**
 * AUTO-BACKFILL-QUEUE - additive durable queue foundation.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const AUTO_BACKFILL_QUEUE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auto_backfill_run (
    id TEXT PRIMARY KEY,
    request_key TEXT NOT NULL,
    registry_version TEXT NOT NULL,
    as_of_business_date TEXT NOT NULL,
    requested_indicator TEXT,
    requested_lane TEXT,
    requested_by TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'RUNNING', 'PAUSING', 'PAUSED', 'COMPLETED',
        'COMPLETED_WITH_ERRORS', 'CANCELLED'
    )),
    status_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auto_backfill_active_request
    ON auto_backfill_run(request_key)
    WHERE status IN ('RUNNING', 'PAUSING', 'PAUSED');

CREATE TABLE IF NOT EXISTS auto_backfill_job (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    indicator TEXT NOT NULL,
    source_lane TEXT NOT NULL,
    business_date TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN (
        'QUEUED', 'RUNNING', 'RECOVERY_CHECK', 'SUCCESS',
        'SKIPPED_ALREADY_SUCCESS', 'FAILED_TERMINAL', 'CANCELLED'
    )),
    indicator_priority INTEGER NOT NULL,
    lane_priority INTEGER NOT NULL,
    completion_policy_id TEXT NOT NULL,
    executor_id TEXT NOT NULL,
    registry_version TEXT NOT NULL,
    lease_owner TEXT,
    lease_token TEXT,
    lease_acquired_at TEXT,
    lease_expires_at TEXT,
    terminal_reason TEXT,
    completion_evidence_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    FOREIGN KEY(run_id) REFERENCES auto_backfill_run(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auto_backfill_active_identity
    ON auto_backfill_job(indicator, source_lane, business_date)
    WHERE state IN ('QUEUED', 'RUNNING', 'RECOVERY_CHECK');

CREATE UNIQUE INDEX IF NOT EXISTS uq_auto_backfill_one_running_job
    ON auto_backfill_job((1))
    WHERE state = 'RUNNING';

CREATE INDEX IF NOT EXISTS idx_auto_backfill_job_order
    ON auto_backfill_job(state, business_date DESC, indicator_priority ASC, lane_priority ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_auto_backfill_job_run
    ON auto_backfill_job(run_id, state);

CREATE TABLE IF NOT EXISTS auto_backfill_attempt (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL,
    lease_owner TEXT NOT NULL,
    lease_token TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'RUNNING', 'SUCCESS', 'SKIPPED_ALREADY_SUCCESS',
        'FAILED_TERMINAL', 'INTERRUPTED'
    )),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    result_code TEXT,
    evidence_json TEXT,
    FOREIGN KEY(job_id) REFERENCES auto_backfill_job(id),
    UNIQUE(job_id, attempt_number),
    UNIQUE(lease_token)
);

CREATE INDEX IF NOT EXISTS idx_auto_backfill_attempt_job
    ON auto_backfill_attempt(job_id, attempt_number);

CREATE TABLE IF NOT EXISTS auto_backfill_worker_lease (
    lease_name TEXT PRIMARY KEY CHECK (lease_name = 'GLOBAL_DKCL'),
    job_id TEXT NOT NULL UNIQUE,
    worker_id TEXT NOT NULL,
    lease_token TEXT NOT NULL UNIQUE,
    acquired_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES auto_backfill_job(id)
);

CREATE INDEX IF NOT EXISTS idx_auto_backfill_worker_lease_expiry
    ON auto_backfill_worker_lease(expires_at);

CREATE TABLE IF NOT EXISTS auto_backfill_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    job_id TEXT,
    attempt_id TEXT,
    event_type TEXT NOT NULL,
    from_state TEXT,
    to_state TEXT,
    reason_code TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(run_id) REFERENCES auto_backfill_run(id),
    FOREIGN KEY(job_id) REFERENCES auto_backfill_job(id),
    FOREIGN KEY(attempt_id) REFERENCES auto_backfill_attempt(id)
);

CREATE INDEX IF NOT EXISTS idx_auto_backfill_event_run
    ON auto_backfill_event(run_id, id);
CREATE INDEX IF NOT EXISTS idx_auto_backfill_event_job
    ON auto_backfill_event(job_id, id);

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_event_no_update
BEFORE UPDATE ON auto_backfill_event
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_event is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_event_no_delete
BEFORE DELETE ON auto_backfill_event
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_event is append-only');
END;
`;

const AUTO_BACKFILL_QUEUE_TABLE_NAMES = [
    'auto_backfill_attempt',
    'auto_backfill_event',
    'auto_backfill_job',
    'auto_backfill_run',
    'auto_backfill_worker_lease',
];

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

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}

function closeDb(db) {
    return new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

async function applyAutoBackfillQueueSchema(dbPath) {
    const db = await openDb(dbPath);
    try {
        await exec(db, 'PRAGMA foreign_keys=ON');
        await exec(db, AUTO_BACKFILL_QUEUE_SCHEMA_SQL);
        const placeholders = AUTO_BACKFILL_QUEUE_TABLE_NAMES.map(() => '?').join(',');
        const rows = await all(
            db,
            `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders}) ORDER BY name`,
            AUTO_BACKFILL_QUEUE_TABLE_NAMES,
        );
        return rows.map((row) => row.name);
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    applyAutoBackfillQueueSchema(dbPath)
        .then((tables) => {
            console.log('[OK] AUTO-BACKFILL-QUEUE tables present:');
            tables.forEach((name) => console.log(`  - ${name}`));
            console.log('[OK] Migration complete. No business data was inserted.');
        })
        .catch((error) => {
            console.error('[FAIL] AUTO-BACKFILL-QUEUE migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyAutoBackfillQueueSchema,
    AUTO_BACKFILL_QUEUE_SCHEMA_SQL,
    AUTO_BACKFILL_QUEUE_TABLE_NAMES,
};

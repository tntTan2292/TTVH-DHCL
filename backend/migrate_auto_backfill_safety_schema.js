/**
 * AUTO-BACKFILL-SAFETY - additive retry, circuit and audit persistence.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const REQUIRED_COLUMNS = Object.freeze({
    auto_backfill_run: Object.freeze({
        safety_state: 'TEXT',
        action_required: 'TEXT',
    }),
    auto_backfill_job: Object.freeze({
        resource_identity: 'TEXT',
        circuit_scope_key: 'TEXT',
        safety_state: 'TEXT',
        next_attempt_at: 'TEXT',
        last_error_class: 'TEXT',
        last_error_signature: 'TEXT',
        action_required: 'TEXT',
    }),
    auto_backfill_attempt: Object.freeze({
        classification: 'TEXT',
        error_signature: 'TEXT',
        retry_at: 'TEXT',
        action_required: 'TEXT',
        safety_outcome: 'TEXT',
    }),
});

const AUTO_BACKFILL_SAFETY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS auto_backfill_circuit (
    scope_key TEXT PRIMARY KEY,
    adapter_id TEXT NOT NULL,
    source_lane TEXT NOT NULL,
    resource_identity TEXT NOT NULL,
    error_signature TEXT,
    consecutive_count INTEGER NOT NULL DEFAULT 0,
    state TEXT NOT NULL CHECK (state IN ('CLOSED', 'OPEN')),
    last_error_code TEXT,
    opened_at TEXT,
    reset_at TEXT,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_backfill_circuit_state
    ON auto_backfill_circuit(state, updated_at);

CREATE INDEX IF NOT EXISTS idx_auto_backfill_job_safety_ready
    ON auto_backfill_job(state, safety_state, next_attempt_at, business_date DESC);

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_attempt_no_delete
BEFORE DELETE ON auto_backfill_attempt
BEGIN
    SELECT RAISE(ABORT, 'auto_backfill_attempt is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_auto_backfill_attempt_terminal_no_update
BEFORE UPDATE ON auto_backfill_attempt
WHEN OLD.status <> 'RUNNING'
BEGIN
    SELECT RAISE(ABORT, 'completed auto_backfill_attempt is immutable');
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

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}

function closeDb(db) {
    return new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

async function ensureColumns(db) {
    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
        const existing = new Set((await all(db, `PRAGMA table_info(${table})`)).map((column) => column.name));
        if (existing.size === 0) throw new Error(`AUTO-BACKFILL-SAFETY requires existing ${table}.`);
        for (const [column, definition] of Object.entries(columns)) {
            if (!existing.has(column)) await exec(db, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        }
    }
}

async function applyAutoBackfillSafetySchema(dbPath) {
    const db = await openDb(dbPath);
    try {
        await exec(db, 'PRAGMA foreign_keys=ON');
        await ensureColumns(db);
        await exec(db, AUTO_BACKFILL_SAFETY_SCHEMA_SQL);
        return {
            table: 'auto_backfill_circuit',
            columns: REQUIRED_COLUMNS,
        };
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    applyAutoBackfillSafetySchema(resolveDbPath(process.argv.slice(2)))
        .then(() => console.log('[OK] AUTO-BACKFILL-SAFETY schema present. No queue or business data was inserted.'))
        .catch((error) => {
            console.error('[FAIL] AUTO-BACKFILL-SAFETY migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    applyAutoBackfillSafetySchema,
    AUTO_BACKFILL_SAFETY_SCHEMA_SQL,
    REQUIRED_COLUMNS,
};

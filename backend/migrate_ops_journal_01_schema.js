/**
 * OPS-JOURNAL-01 -- additive tables of the Nhat ky dieu hanh (PL06): the black spots the Giam doc TTVH picks each day,
 * the "6 ro" rows assigned for each, who they are assigned to, the end-of-day closing and an append-only change log.
 *
 * ops_journal_day              one row per day (status DRAFT -> ASSIGNED -> CLOSED)
 * ops_journal_spot             a black spot of the day; metrics are SNAPSHOTTED here so the journal does not move when data is re-imported
 * ops_journal_action           one "6 ro" row of a spot; an assignee sees it only after assigned_at is set (the spot is finalized)
 * ops_journal_action_assignee  who a row is assigned to (a table, not a JSON column, so visibility is one indexed join)
 * ops_journal_action_log       append-only record of every change (never updated or deleted)
 * ops_journal_closing          end-of-day result and lessons of a spot (PL06 sections 3 and 4)
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const STATEMENTS = Object.freeze([
    `CREATE TABLE IF NOT EXISTS ops_journal_day (
        day TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ASSIGNED', 'CLOSED')),
        created_by INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ops_journal_spot (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        indicator TEXT NOT NULL CHECK (indicator IN ('F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON')),
        scope_type TEXT NOT NULL CHECK (scope_type IN ('BCVH', 'ROUTE', 'CUSTOMER', 'PAIR')),
        scope_key TEXT,
        office_code TEXT,
        title TEXT NOT NULL,
        headline TEXT,
        metrics_json TEXT,
        source TEXT NOT NULL DEFAULT 'SYSTEM' CHECK (source IN ('SYSTEM', 'MANUAL')),
        status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED', 'CLOSED')),
        finalized_at INTEGER,
        finalized_by INTEGER,
        detected_at TEXT,
        channel TEXT,
        sort INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_ops_journal_spot_day ON ops_journal_spot(day, sort)',
    `CREATE TABLE IF NOT EXISTS ops_journal_action (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spot_id INTEGER NOT NULL,
        seq INTEGER NOT NULL,
        who_text TEXT,
        what TEXT,
        where_text TEXT,
        due TEXT,
        how TEXT,
        expected_result TEXT,
        assigned_at INTEGER,
        status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'REPORTED', 'DONE')),
        report_cause TEXT,
        report_text TEXT,
        reported_by INTEGER,
        reported_at INTEGER,
        UNIQUE (spot_id, seq)
    )`,
    `CREATE TABLE IF NOT EXISTS ops_journal_action_assignee (
        action_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (action_id, user_id)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_ops_journal_assignee_user ON ops_journal_action_assignee(user_id)',
    `CREATE TABLE IF NOT EXISTS ops_journal_action_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spot_id INTEGER NOT NULL,
        action_id INTEGER,
        kind TEXT NOT NULL,
        before_json TEXT,
        after_json TEXT,
        actor_id INTEGER NOT NULL,
        actor_name TEXT,
        actor_position TEXT,
        created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_ops_journal_log_spot ON ops_journal_action_log(spot_id, id)',
    `CREATE TABLE IF NOT EXISTS ops_journal_closing (
        spot_id INTEGER PRIMARY KEY,
        resolved INTEGER,
        recovered INTEGER,
        handling_time_text TEXT,
        lesson TEXT,
        process_update TEXT,
        signed_by INTEGER,
        done_time TEXT,
        updated_at INTEGER NOT NULL
    )`,
]);

const TABLES = Object.freeze([
    'ops_journal_day', 'ops_journal_spot', 'ops_journal_action', 'ops_journal_action_assignee', 'ops_journal_action_log', 'ops_journal_closing',
]);

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
}

async function applyOpsJournal01Schema(dbPath) {
    const db = await new Promise((resolve, reject) => {
        const handle = new sqlite3.Database(dbPath, (error) => (error ? reject(error) : resolve(handle)));
    });
    try {
        await exec(db, 'PRAGMA busy_timeout = 30000;');
        for (const statement of STATEMENTS) await exec(db, statement);
    } finally {
        await new Promise((resolve) => db.close(() => resolve()));
    }
    return { tables: [...TABLES] };
}

module.exports = { applyOpsJournal01Schema, STATEMENTS, TABLES };

if (require.main === module) {
    applyOpsJournal01Schema(resolveDbPath(process.argv.slice(2)))
        .then((result) => console.log('OPS-JOURNAL-01 schema applied:', result.tables.join(', ')))
        .catch((error) => {
            console.error('OPS-JOURNAL-01 schema failed:', error.message);
            process.exit(1);
        });
}

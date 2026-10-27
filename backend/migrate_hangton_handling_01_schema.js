/**
 * HANGTON-HANDLING-01 -- additive tables for the follow-up of stock (hang ton) handling.
 *
 * hangton_handling_log     append-only record of every review a person enters for a parcel (never updated or deleted)
 * hangton_edit_request     request to correct an entry of a past day, decided by a chuyen quan / admin
 * hangton_reason_map       free-text "Khac" answers a chuyen quan has put into a standard group (applies to old and new rows)
 * hangton_option_group     groups a chuyen quan created for the "Khac" answers (the standard options live in code)
 *
 * Parcels are keyed by item_code, NOT by snapshot: a snapshot is replaced when it is taken again, the handling is not.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const STATEMENTS = Object.freeze([
    `CREATE TABLE IF NOT EXISTS hangton_handling_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_code TEXT NOT NULL,
        business_date TEXT NOT NULL,
        snapshot_id INTEGER,
        slot TEXT,
        office_code TEXT,
        office TEXT,
        ton_level TEXT,
        customer_class TEXT,
        action TEXT NOT NULL CHECK (action IN ('REVIEW', 'KEEP', 'EDIT', 'EDIT_APPROVED')),
        cause_code TEXT NOT NULL,
        cause_text TEXT,
        plan_code TEXT NOT NULL,
        plan_text TEXT,
        result_code TEXT NOT NULL,
        result_text TEXT,
        due_date TEXT,
        postman_code TEXT,
        postman_name TEXT,
        note TEXT,
        actor_id INTEGER NOT NULL,
        actor_name TEXT,
        actor_position TEXT,
        approved_by_id INTEGER,
        approved_by_name TEXT,
        supersedes_id INTEGER,
        created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_hangton_log_item ON hangton_handling_log(item_code, business_date, id)',
    'CREATE INDEX IF NOT EXISTS idx_hangton_log_day ON hangton_handling_log(business_date, office_code)',
    `CREATE TABLE IF NOT EXISTS hangton_edit_request (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id INTEGER NOT NULL,
        item_code TEXT NOT NULL,
        office_code TEXT,
        business_date TEXT NOT NULL,
        proposed TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        requested_by_id INTEGER NOT NULL,
        requested_by_name TEXT,
        requested_at INTEGER NOT NULL,
        decided_by_id INTEGER,
        decided_by_name TEXT,
        decided_at INTEGER,
        decision_note TEXT,
        applied_log_id INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_hangton_edit_status ON hangton_edit_request(status, office_code)',
    `CREATE TABLE IF NOT EXISTS hangton_option_group (
        kind TEXT NOT NULL CHECK (kind IN ('cause', 'plan', 'result')),
        code TEXT NOT NULL,
        label TEXT NOT NULL,
        created_by_id INTEGER,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (kind, code)
    )`,
    `CREATE TABLE IF NOT EXISTS hangton_reason_map (
        kind TEXT NOT NULL CHECK (kind IN ('cause', 'plan', 'result')),
        norm_text TEXT NOT NULL,
        sample_text TEXT,
        group_code TEXT NOT NULL,
        set_by_id INTEGER,
        set_at INTEGER NOT NULL,
        PRIMARY KEY (kind, norm_text)
    )`,
]);

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
}

async function applyHangtonHandling01Schema(dbPath) {
    const db = await new Promise((resolve, reject) => {
        const handle = new sqlite3.Database(dbPath, (error) => (error ? reject(error) : resolve(handle)));
    });
    try {
        await exec(db, 'PRAGMA busy_timeout = 30000;');
        for (const statement of STATEMENTS) await exec(db, statement);
    } finally {
        await new Promise((resolve) => db.close(() => resolve()));
    }
    return { tables: ['hangton_handling_log', 'hangton_edit_request', 'hangton_option_group', 'hangton_reason_map'] };
}

module.exports = { applyHangtonHandling01Schema, STATEMENTS };

if (require.main === module) {
    applyHangtonHandling01Schema(resolveDbPath(process.argv.slice(2)))
        .then((result) => console.log('HANGTON-HANDLING-01 schema applied:', result.tables.join(', ')))
        .catch((error) => {
            console.error('HANGTON-HANDLING-01 schema failed:', error.message);
            process.exit(1);
        });
}

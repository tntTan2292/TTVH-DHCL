/**
 * OPS-JOURNAL-01 (round 2) -- additive tables: evidence files attached to a report, and the in-app notifications.
 *
 * ops_journal_attachment    a file an assignee attaches to a row of a finalized spot (Excel data, scanned minutes ...); the bytes live on
 *                           disk under the journal storage folder, never in the database, and only the manager and the people named on
 *                           the row can download them
 * ops_journal_notification  one notification of one user (new task, a report came in, a row was accepted); read_at NULL = unread
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const STATEMENTS = Object.freeze([
    `CREATE TABLE IF NOT EXISTS ops_journal_attachment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_id INTEGER NOT NULL,
        spot_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime TEXT,
        size INTEGER NOT NULL,
        uploaded_by INTEGER NOT NULL,
        uploaded_at INTEGER NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_ops_journal_attachment_action ON ops_journal_attachment(action_id)',
    `CREATE TABLE IF NOT EXISTS ops_journal_notification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('ASSIGNED', 'REPORTED', 'DONE')),
        target TEXT NOT NULL DEFAULT 'MY_TASKS' CHECK (target IN ('MANAGER', 'MY_TASKS')),
        day TEXT,
        spot_id INTEGER,
        action_id INTEGER,
        title TEXT NOT NULL,
        body TEXT,
        created_at INTEGER NOT NULL,
        read_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS idx_ops_journal_notification_user ON ops_journal_notification(user_id, id)',
]);

const TABLES = Object.freeze(['ops_journal_attachment', 'ops_journal_notification']);

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
}

async function applyOpsJournal02Schema(dbPath) {
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

module.exports = { applyOpsJournal02Schema, STATEMENTS, TABLES };

if (require.main === module) {
    applyOpsJournal02Schema(resolveDbPath(process.argv.slice(2)))
        .then((result) => console.log('OPS-JOURNAL-02 schema applied:', result.tables.join(', ')))
        .catch((error) => {
            console.error('OPS-JOURNAL-02 schema failed:', error.message);
            process.exit(1);
        });
}

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const operationalDbPath = path.resolve(__dirname, '../db/database.sqlite');
const configuredTestDbPath = process.env.QIS_TEST_DB_PATH
    ? path.resolve(process.env.QIS_TEST_DB_PATH)
    : null;

if (process.env.NODE_ENV === 'test') {
    if (!configuredTestDbPath) {
        throw new Error('NODE_ENV=test requires QIS_TEST_DB_PATH to point to an isolated SQLite database.');
    }
    if (configuredTestDbPath === operationalDbPath) {
        throw new Error('QIS_TEST_DB_PATH must not resolve to the operational database.sqlite.');
    }
}

const dbPath = process.env.NODE_ENV === 'test'
    ? configuredTestDbPath
    : operationalDbPath;
const db = new sqlite3.Database(dbPath);

// Per-connection settings only: no schema, index, or database-data mutation.
// These run before repository work is queued on SQLite's serialized connection.
// busy_timeout matches AutoBackfillQueueStore's own connection (autoBackfillQueueStore.js
// PRAGMA busy_timeout=5000) so this shared connection waits out a brief writer lock from the
// queue store's separate connection instead of throwing SQLITE_BUSY immediately -- root cause
// of the F4.1 2026-09-06/HUE auto-backfill job going FAILED_TERMINAL when a burst of new
// auto_backfill_run/job rows was being written on that other connection at the same moment this
// connection tried to commit the executor's completion write.
db.exec('PRAGMA mmap_size = 268435456; PRAGMA threads = 4; PRAGMA busy_timeout = 5000;', (err) => {
    if (err) console.warn('SQLite read-performance PRAGMA unavailable:', err.message);
});

// Utility wrappers for async/await
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

module.exports = { db, run, get, all, dbPath, operationalDbPath };

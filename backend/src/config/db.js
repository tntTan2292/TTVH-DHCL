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

// PERF-LOAD-01 Phase 1: the dashboards aggregate over a multi-GB file; the default 2 MB page cache
// forces re-reading it from disk on every request. 256 MB is an upper bound (pages are cached lazily).
db.exec('PRAGMA cache_size = -262144;', (err) => {
    if (err) console.warn('SQLite cache_size PRAGMA unavailable:', err.message);
});

// PERF-LOAD-01 Phase 1: WAL lets dashboard reads continue while an import/backfill commits (rollback
// journal mode blocks readers during a write). The mode is persistent in the file. Kept off for tests
// (isolated throw-away DBs) and switchable with QIS_SQLITE_WAL=off. NORMAL sync is the documented WAL
// pairing: a power cut can lose the last commit but never corrupts the database.
if (process.env.NODE_ENV !== 'test' && String(process.env.QIS_SQLITE_WAL || 'on').toLowerCase() !== 'off') {
    db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;', (err) => {
        if (err) console.warn('SQLite WAL PRAGMA unavailable (database stays in its current journal mode):', err.message);
    });
}

// PERF-LOAD-01: the import transactions run on this shared connection, so a dashboard read issued
// while one is open sees half-written detail rows. txState lets the aggregate shadow comparison
// recognise (and ignore) such reads: `active` > 0 while a transaction is open, `generation` moves on
// every COMMIT / ROLLBACK.
const txState = { active: 0, generation: 0 };

// Utility wrappers for async/await
const run = (sql, params = []) => new Promise((resolve, reject) => {
    const head = typeof sql === 'string' ? sql.trimStart().slice(0, 12).toUpperCase() : '';
    const isBegin = head.startsWith('BEGIN');
    const isEnd = head.startsWith('COMMIT') || head.startsWith('ROLLBACK') || head.startsWith('END');
    db.run(sql, params, function(err) {
        if (isBegin && !err) txState.active += 1;
        if (isEnd && !err) {
            txState.active = Math.max(0, txState.active - 1);
            txState.generation += 1;
        }
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

module.exports = { db, run, get, all, dbPath, operationalDbPath, txState };

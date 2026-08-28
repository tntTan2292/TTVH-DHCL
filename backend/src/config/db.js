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

// Per-connection read-performance settings only: no schema, index, or database-data mutation.
// These run before repository work is queued on SQLite's serialized connection.
db.exec('PRAGMA mmap_size = 268435456; PRAGMA threads = 4;', (err) => {
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

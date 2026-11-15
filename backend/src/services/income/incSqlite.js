'use strict';
/** Small promise wrapper over the sqlite3 package for the income module: one connection, explicit transaction. */
const sqlite3 = require('sqlite3').verbose();

function open(dbPath, { readOnly = false } = {}) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, readOnly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE, (err) => {
            if (err) return reject(err);
            db.run('PRAGMA busy_timeout = 30000', (e) => (e ? reject(e) : resolve(db)));
        });
    });
}
const run = (db, sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function onRun(err) { return err ? reject(err) : resolve({ changes: this.changes, lastID: this.lastID }); }));
const all = (db, sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))));
const get = (db, sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
const close = (db) => new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve())));

/** Runs fn(db) inside BEGIN IMMEDIATE; commits on success, rolls back on any error (or when dryRun is true). */
async function inTransaction(db, fn, { dryRun = false } = {}) {
    await run(db, 'BEGIN IMMEDIATE');
    try {
        const result = await fn(db);
        await run(db, dryRun ? 'ROLLBACK' : 'COMMIT');
        return result;
    } catch (error) {
        await run(db, 'ROLLBACK').catch(() => {});
        throw error;
    }
}

async function audit(db, actor, action, ky, detail) {
    await run(db, 'INSERT INTO inc_audit_log (at, actor, action, ky, detail) VALUES (?, ?, ?, ?, ?)',
        [new Date().toISOString(), actor || 'unknown', action, ky || null, detail === undefined ? null : JSON.stringify(detail)]);
}

module.exports = { open, run, all, get, close, inTransaction, audit };

'use strict';

/**
 * test_dbBusyTimeoutConfig.js — F41-AUTOBF-RUNTIME-INCIDENT-01
 *
 * Regression for the 2026-09-07 F4.1 Auto Backfill incident: run
 * d4d8acb7-7b48-4ebf-b8ef-09d9559ffc7a (F4.1/HUE/2026-09-06) went
 * FAILED_TERMINAL/COMPLETED_WITH_ERRORS with result_code SQLITE_BUSY.
 *
 * Root cause: `backend/src/config/db.js`'s shared connection (used by
 * importPipeline.js to commit the executor's completion write) had no
 * `PRAGMA busy_timeout` set, while `autoBackfillQueueStore.js` opens its own,
 * separate connection to the same database file and does set
 * `busy_timeout=5000` around its own `BEGIN IMMEDIATE` transactions (job/run
 * writes). When the queue store's connection held a write lock -- e.g. a
 * burst of new auto_backfill_run/job rows being written for a batch of
 * newly-submitted runs -- the config/db.js connection, having no
 * busy_timeout, threw SQLITE_BUSY immediately instead of waiting the lock
 * out, and SQLITE_BUSY is classified SYSTEM (non-retriable), so the job
 * terminalized instead of retrying.
 *
 * This test reproduces the race directly against a real on-disk SQLite file
 * (in-memory databases do not exhibit file-level lock contention) and
 * asserts that a write on the config/db.js connection no longer throws
 * SQLITE_BUSY while another connection holds a short-lived write lock well
 * within the configured busy_timeout window.
 */

const assert = require('assert/strict');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { createSandbox, initSchema, destroySandbox } = require('./test/importTestSandbox');

const sandbox = createSandbox('qis-db-busy-timeout-test-');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = sandbox.dbPath;

// Must be required after QIS_TEST_DB_PATH is set -- db.js resolves its path at require-time.
const { db, run } = require('./src/config/db');

function openSeparateConnection(dbPath) {
    return new Promise((resolve, reject) => {
        const conn = new sqlite3.Database(dbPath, (error) => (error ? reject(error) : resolve(conn)));
    });
}

function exec(conn, sql) {
    return new Promise((resolve, reject) => conn.exec(sql, (error) => (error ? reject(error) : resolve())));
}

function closeConn(conn) {
    return new Promise((resolve, reject) => conn.close((error) => (error ? reject(error) : resolve())));
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    await new Promise((resolve, reject) => db.exec('SELECT 1', (err) => (err ? reject(err) : resolve())));
    await initSchema(db);

    console.log('\nTEST 1: config/db.js connection carries the same busy_timeout as the queue store');
    const pragmaValue = await new Promise((resolve, reject) => {
        db.get('PRAGMA busy_timeout', (error, row) => (error ? reject(error) : resolve(row)));
    });
    assert.equal(pragmaValue.timeout, 5000, 'config/db.js must set PRAGMA busy_timeout=5000, matching autoBackfillQueueStore.js');

    console.log('\nTEST 2: a write on config/db.js\'s connection survives a concurrent writer holding the file lock');
    // Reproduce the real topology: a second, independent connection to the same file (as
    // autoBackfillQueueStore.openDb() creates per call), holding an exclusive write lock via
    // BEGIN IMMEDIATE for longer than an un-timed-out connection would tolerate, but well inside
    // this connection's 5s busy_timeout.
    const otherConn = await openSeparateConnection(sandbox.dbPath);
    await exec(otherConn, 'PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;');
    await exec(otherConn, "INSERT INTO system_config (config_key, config_value) VALUES ('lock_holder_test', 'x')");

    // Longer than node-sqlite3's own undocumented default busy_timeout (1000ms) but well inside
    // this connection's configured 5000ms, so this step alone -- independent of TEST 1's direct
    // PRAGMA check -- also fails against the pre-fix default.
    const releaseDelayMs = 1500;
    const releaseTimer = wait(releaseDelayMs).then(() => exec(otherConn, 'COMMIT;'));

    let caughtBusy = null;
    try {
        await run("INSERT INTO system_config (config_key, config_value) VALUES ('regression_write', 'ok')");
    } catch (error) {
        caughtBusy = error;
    }
    await releaseTimer;

    assert.equal(caughtBusy, null, `config/db.js write must wait out the lock instead of throwing SQLITE_BUSY, got: ${caughtBusy?.message}`);

    const written = await new Promise((resolve, reject) => {
        db.get("SELECT config_value FROM system_config WHERE config_key='regression_write'", (error, row) => (error ? reject(error) : resolve(row)));
    });
    assert.equal(written?.config_value, 'ok', 'the write that waited out the lock must actually have committed');

    await closeConn(otherConn);

    console.log('\nRESULT: db.js busy_timeout regression checks passed');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => {
    db.close(() => destroySandbox(sandbox));
});

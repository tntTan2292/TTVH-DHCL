'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema, REQUIRED_COLUMNS } = require('./migrate_auto_backfill_safety_schema');

function withDb(dbPath, callback) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, async (openError) => {
            if (openError) return reject(openError);
            try {
                const result = await callback(db);
                db.close((closeError) => closeError ? reject(closeError) : resolve(result));
            } catch (error) {
                db.close(() => reject(error));
            }
        });
    });
}

function all(db, sql) {
    return new Promise((resolve, reject) => db.all(sql, (error, rows) => error ? reject(error) : resolve(rows)));
}

function get(db, sql) {
    return new Promise((resolve, reject) => db.get(sql, (error, row) => error ? reject(error) : resolve(row)));
}

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, function onRun(error) {
        if (error) reject(error);
        else resolve(this);
    }));
}

test('Safety startup migration is additive, empty, and idempotent', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-safety-migration-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillQueueSchema(dbPath);
        await applyAutoBackfillSafetySchema(dbPath);
        await applyAutoBackfillSafetySchema(dbPath);
        await withDb(dbPath, async (db) => {
            for (const [table, required] of Object.entries(REQUIRED_COLUMNS)) {
                const names = new Set((await all(db, `PRAGMA table_info(${table})`)).map((column) => column.name));
                for (const column of Object.keys(required)) assert.ok(names.has(column), `${table}.${column}`);
            }
            assert.equal((await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_circuit')).n, 0);
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('completed Safety attempts are immutable and cannot be deleted', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-safety-attempt-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillQueueSchema(dbPath);
        await applyAutoBackfillSafetySchema(dbPath);
        await withDb(dbPath, async (db) => {
            const now = new Date().toISOString();
            await run(db, `INSERT INTO auto_backfill_run
                (id, request_key, registry_version, as_of_business_date, requested_by, status, created_at, updated_at)
                VALUES ('run-1', 'request-1', 'test', '2026-01-01', 'admin', 'COMPLETED', ?, ?)`, [now, now]);
            await run(db, `INSERT INTO auto_backfill_job
                (id, run_id, indicator, source_lane, business_date, state, indicator_priority, lane_priority,
                 completion_policy_id, executor_id, registry_version, created_at, updated_at)
                VALUES ('job-1', 'run-1', 'F9.TEST', 'HUE', '2026-01-01', 'SUCCESS', 1, 1,
                        'policy', 'executor', 'test', ?, ?)`, [now, now]);
            await run(db, `INSERT INTO auto_backfill_attempt
                (id, job_id, attempt_number, lease_owner, lease_token, status, started_at, ended_at)
                VALUES ('attempt-1', 'job-1', 1, 'worker', 'lease', 'SUCCESS', ?, ?)`, [now, now]);
            await assert.rejects(run(db, "UPDATE auto_backfill_attempt SET result_code = 'CHANGED' WHERE id = 'attempt-1'"), /immutable/);
            await assert.rejects(run(db, "DELETE FROM auto_backfill_attempt WHERE id = 'attempt-1'"), /append-only/);
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

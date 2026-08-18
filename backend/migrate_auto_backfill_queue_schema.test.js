'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const {
    applyAutoBackfillQueueSchema,
    AUTO_BACKFILL_QUEUE_TABLE_NAMES,
} = require('./migrate_auto_backfill_queue_schema');

function tempDbPath() {
    return path.join(os.tmpdir(), `auto-backfill-queue-migration-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

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

function get(db, sql, params = []) {
    return new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
}

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, function onRun(error) {
        if (error) reject(error);
        else resolve(this);
    }));
}

test('startup queue migration is additive, empty, and idempotent', async () => {
    const dbPath = tempDbPath();
    try {
        assert.deepEqual(await applyAutoBackfillQueueSchema(dbPath), [...AUTO_BACKFILL_QUEUE_TABLE_NAMES].sort());
        assert.deepEqual(await applyAutoBackfillQueueSchema(dbPath), [...AUTO_BACKFILL_QUEUE_TABLE_NAMES].sort());
        await withDb(dbPath, async (db) => {
            for (const table of AUTO_BACKFILL_QUEUE_TABLE_NAMES) {
                assert.equal((await get(db, `SELECT COUNT(*) AS n FROM ${table}`)).n, 0);
            }
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('state-transition events are append-only', async () => {
    const dbPath = tempDbPath();
    try {
        await applyAutoBackfillQueueSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const now = new Date().toISOString();
            await run(db, `INSERT INTO auto_backfill_run
                (id, request_key, registry_version, as_of_business_date, requested_by, status, created_at, updated_at)
                VALUES ('run-1', 'key-1', 'test', '2026-01-02', 'admin', 'RUNNING', ?, ?)`, [now, now]);
            await run(db, `INSERT INTO auto_backfill_event
                (run_id, event_type, to_state, created_at) VALUES ('run-1', 'RUN_CREATED', 'RUNNING', ?)`, [now]);
            await assert.rejects(run(db, "UPDATE auto_backfill_event SET to_state = 'PAUSED' WHERE id = 1"), /append-only/);
            await assert.rejects(run(db, 'DELETE FROM auto_backfill_event WHERE id = 1'), /append-only/);
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

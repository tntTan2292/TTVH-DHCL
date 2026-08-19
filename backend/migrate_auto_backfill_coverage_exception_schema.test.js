'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { applyAutoBackfillQueueSchema } = require('./migrate_auto_backfill_queue_schema');
const { applyAutoBackfillSafetySchema } = require('./migrate_auto_backfill_safety_schema');
const { applyAutoBackfillCoverageExceptionSchema } = require('./migrate_auto_backfill_coverage_exception_schema');

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

test('Coverage Exception startup migration is additive, empty, and idempotent', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-coverage-exception-migration-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillQueueSchema(dbPath);
        await applyAutoBackfillSafetySchema(dbPath);
        await applyAutoBackfillCoverageExceptionSchema(dbPath);
        await applyAutoBackfillCoverageExceptionSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const tables = new Set((await all(db, "SELECT name FROM sqlite_master WHERE type = 'table'")).map((row) => row.name));
            assert.ok(tables.has('auto_backfill_coverage_exception'));
            assert.ok(tables.has('auto_backfill_coverage_exception_event'));
            assert.equal((await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_coverage_exception')).n, 0);
            assert.equal((await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_coverage_exception_event')).n, 0);
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('only one ACTIVE exception is allowed per indicator/lane/date, revoked history is preserved', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-coverage-exception-unique-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillQueueSchema(dbPath);
        await applyAutoBackfillSafetySchema(dbPath);
        await applyAutoBackfillCoverageExceptionSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const now = new Date().toISOString();
            const insertException = (id, status) => run(db, `INSERT INTO auto_backfill_coverage_exception
                (id, indicator, source_lane, business_date, exception_type, status, reason, registry_version, created_by, created_at)
                VALUES (?, 'F9.TEST', 'HUE', '2026-01-01', 'PO_EXEMPTED', ?, 'reason', 'test', 'admin', ?)`, [id, status, now]);

            await insertException('exc-1', 'ACTIVE');
            await assert.rejects(insertException('exc-2', 'ACTIVE'), /UNIQUE/);
            await run(db, "UPDATE auto_backfill_coverage_exception SET status = 'REVOKED', revoked_by = 'admin', revoked_at = ?, revoke_reason = 'undo' WHERE id = 'exc-1'", [now]);
            await insertException('exc-3', 'ACTIVE');

            const rows = await all(db, "SELECT id, status FROM auto_backfill_coverage_exception ORDER BY id");
            assert.deepEqual(rows, [
                { id: 'exc-1', status: 'REVOKED' },
                { id: 'exc-3', status: 'ACTIVE' },
            ]);
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('a revoked exception cannot be mutated again, and no exception can be hard-deleted', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-coverage-exception-immutable-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillQueueSchema(dbPath);
        await applyAutoBackfillSafetySchema(dbPath);
        await applyAutoBackfillCoverageExceptionSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const now = new Date().toISOString();
            await run(db, `INSERT INTO auto_backfill_coverage_exception
                (id, indicator, source_lane, business_date, exception_type, status, reason, registry_version, created_by, created_at)
                VALUES ('exc-1', 'F9.TEST', 'HUE', '2026-01-01', 'PO_EXEMPTED', 'ACTIVE', 'reason', 'test', 'admin', ?)`, [now]);
            await run(db, "UPDATE auto_backfill_coverage_exception SET status = 'REVOKED', revoked_by = 'admin', revoked_at = ?, revoke_reason = 'undo' WHERE id = 'exc-1'", [now]);
            await assert.rejects(
                run(db, "UPDATE auto_backfill_coverage_exception SET reason = 'tampered' WHERE id = 'exc-1'"),
                /immutable/,
            );
            await assert.rejects(
                run(db, "DELETE FROM auto_backfill_coverage_exception WHERE id = 'exc-1'"),
                /cannot be deleted/,
            );
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('the exception event ledger is append-only', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-coverage-exception-event-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillQueueSchema(dbPath);
        await applyAutoBackfillSafetySchema(dbPath);
        await applyAutoBackfillCoverageExceptionSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const now = new Date().toISOString();
            await run(db, `INSERT INTO auto_backfill_coverage_exception
                (id, indicator, source_lane, business_date, exception_type, status, reason, registry_version, created_by, created_at)
                VALUES ('exc-1', 'F9.TEST', 'HUE', '2026-01-01', 'PO_EXEMPTED', 'ACTIVE', 'reason', 'test', 'admin', ?)`, [now]);
            await run(db, `INSERT INTO auto_backfill_coverage_exception_event
                (exception_id, event_type, exception_type, indicator, source_lane, business_date, reason, actor, created_at)
                VALUES ('exc-1', 'CREATED', 'PO_EXEMPTED', 'F9.TEST', 'HUE', '2026-01-01', 'reason', 'admin', ?)`, [now]);
            await assert.rejects(
                run(db, "UPDATE auto_backfill_coverage_exception_event SET reason = 'tampered' WHERE exception_id = 'exc-1'"),
                /append-only/,
            );
            await assert.rejects(
                run(db, "DELETE FROM auto_backfill_coverage_exception_event WHERE exception_id = 'exc-1'"),
                /append-only/,
            );
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

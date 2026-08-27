'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { applyAutoBackfillHolidayCalendarSchema } = require('./migrate_auto_backfill_holiday_calendar_schema');

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

const insertHoliday = (db, id, status, businessDate = '2026-01-01') => run(db, `INSERT INTO auto_backfill_holiday_calendar
    (id, business_date, reason, status, created_by, created_at)
    VALUES (?, ?, 'Nghỉ lễ', ?, 'admin', ?)`, [id, businessDate, status, new Date().toISOString()]);

test('AB-CALENDAR-01 startup migration is additive, empty, and idempotent', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-holiday-migration-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillHolidayCalendarSchema(dbPath);
        await applyAutoBackfillHolidayCalendarSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const tables = new Set((await all(db, "SELECT name FROM sqlite_master WHERE type = 'table'")).map((row) => row.name));
            assert.ok(tables.has('auto_backfill_holiday_calendar'));
            assert.ok(tables.has('auto_backfill_holiday_calendar_event'));
            assert.equal((await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_holiday_calendar')).n, 0);
            assert.equal((await get(db, 'SELECT COUNT(*) AS n FROM auto_backfill_holiday_calendar_event')).n, 0);
            // The holiday migration must not create, touch, or depend on the
            // coverage-exception tables (design Section 7, R3).
            assert.equal(tables.has('auto_backfill_coverage_exception'), false);
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('only one ACTIVE holiday is allowed per business_date, revoked history is preserved', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-holiday-unique-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillHolidayCalendarSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const now = new Date().toISOString();
            await insertHoliday(db, 'hol-1', 'ACTIVE');
            await assert.rejects(insertHoliday(db, 'hol-2', 'ACTIVE'), /UNIQUE/);
            await run(db, "UPDATE auto_backfill_holiday_calendar SET status = 'REVOKED', revoked_by = 'admin', revoked_at = ?, revoke_reason = 'undo' WHERE id = 'hol-1'", [now]);
            await insertHoliday(db, 'hol-3', 'ACTIVE');

            const rows = await all(db, 'SELECT id, status FROM auto_backfill_holiday_calendar ORDER BY id');
            assert.deepEqual(rows, [
                { id: 'hol-1', status: 'REVOKED' },
                { id: 'hol-3', status: 'ACTIVE' },
            ]);
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('a revoked holiday cannot be mutated again, and no holiday can be hard-deleted', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-holiday-immutable-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillHolidayCalendarSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const now = new Date().toISOString();
            await insertHoliday(db, 'hol-1', 'ACTIVE');
            await run(db, "UPDATE auto_backfill_holiday_calendar SET status = 'REVOKED', revoked_by = 'admin', revoked_at = ?, revoke_reason = 'undo' WHERE id = 'hol-1'", [now]);
            await assert.rejects(
                run(db, "UPDATE auto_backfill_holiday_calendar SET reason = 'tampered' WHERE id = 'hol-1'"),
                /immutable/,
            );
            await assert.rejects(
                run(db, "DELETE FROM auto_backfill_holiday_calendar WHERE id = 'hol-1'"),
                /cannot be deleted/,
            );
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

test('the holiday event ledger is append-only', async () => {
    const dbPath = path.join(os.tmpdir(), `auto-backfill-holiday-event-${Date.now()}.sqlite`);
    try {
        await applyAutoBackfillHolidayCalendarSchema(dbPath);
        await withDb(dbPath, async (db) => {
            const now = new Date().toISOString();
            await insertHoliday(db, 'hol-1', 'ACTIVE');
            await run(db, `INSERT INTO auto_backfill_holiday_calendar_event
                (holiday_id, event_type, business_date, reason, actor, created_at)
                VALUES ('hol-1', 'CREATED', '2026-01-01', 'Nghỉ lễ', 'admin', ?)`, [now]);
            await assert.rejects(
                run(db, "UPDATE auto_backfill_holiday_calendar_event SET reason = 'tampered' WHERE holiday_id = 'hol-1'"),
                /append-only/,
            );
            await assert.rejects(
                run(db, "DELETE FROM auto_backfill_holiday_calendar_event WHERE holiday_id = 'hol-1'"),
                /append-only/,
            );
        });
    } finally {
        fs.rmSync(dbPath, { force: true });
    }
});

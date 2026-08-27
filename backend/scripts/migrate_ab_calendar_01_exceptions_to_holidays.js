/**
 * AB-CALENDAR-01 remediation -- migrate existing PO coverage exceptions to
 * the shared LỊCH NGHỈ calendar.
 *
 * Product Owner confirmed: every currently ACTIVE `auto_backfill_coverage_exception`
 * row is a day the source did not operate (a holiday), not a per-indicator business
 * decision that must stay per-tuple. This one-off, idempotent, single-transaction
 * script:
 *
 *   1. Groups every ACTIVE exception by `business_date`.
 *   2. Creates at most one ACTIVE `auto_backfill_holiday_calendar` row per date,
 *      with the original exception reason(s) and ids kept traceable in its own
 *      `reason` field.
 *   3. Revokes (never deletes) every ACTIVE exception migrated, with a fixed,
 *      identifiable revoke reason and actor.
 *
 * Idempotent by construction: it only ever selects currently ACTIVE exceptions.
 * Re-running after a successful migration finds nothing ACTIVE left to migrate
 * and performs no writes. If a date already carries an ACTIVE holiday from some
 * other source, the whole run aborts before any write (see `preflight()`).
 *
 * Usage: node scripts/migrate_ab_calendar_01_exceptions_to_holidays.js [--db <path>] [--dry-run]
 */
'use strict';

const crypto = require('node:crypto');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const MIGRATION_ACTOR = 'ab-calendar-01-migration';
const MIGRATION_REVOKE_REASON = 'Migrated to shared LỊCH NGHỈ';

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, '../src/db/database.sqlite');
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (error) => error ? reject(error) : resolve(db));
    });
}

function closeDb(db) {
    return new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, function onRun(error) {
        if (error) reject(error);
        else resolve(this);
    }));
}

function all(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}

/**
 * Groups the currently ACTIVE exceptions by business_date and aborts the
 * whole run (no writes yet at this point) if any date is unsafe to migrate:
 * a date that already carries an ACTIVE holiday would violate the calendar's
 * one-active-holiday-per-date invariant.
 */
async function preflight(db) {
    const activeExceptions = await all(db, `
        SELECT id, indicator, source_lane, business_date, exception_type, reason, created_by, created_at
        FROM auto_backfill_coverage_exception
        WHERE status = 'ACTIVE'
        ORDER BY business_date, indicator, source_lane
    `);

    const byDate = new Map();
    for (const row of activeExceptions) {
        if (!byDate.has(row.business_date)) byDate.set(row.business_date, []);
        byDate.get(row.business_date).push(row);
    }

    const conflicts = [];
    for (const businessDate of byDate.keys()) {
        const existingHoliday = await all(db, `
            SELECT id FROM auto_backfill_holiday_calendar WHERE business_date = ? AND status = 'ACTIVE'
        `, [businessDate]);
        if (existingHoliday.length > 0) {
            conflicts.push({ businessDate, reason: `an ACTIVE holiday (${existingHoliday[0].id}) already exists for this date` });
        }
    }

    return { byDate, conflicts, totalActiveExceptions: activeExceptions.length };
}

async function migrate({ db, byDate, dryRun }) {
    const now = new Date().toISOString();
    const holidaysCreated = [];
    const exceptionsRevoked = [];

    if (!dryRun) await run(db, 'BEGIN TRANSACTION');
    try {
        for (const [businessDate, exceptions] of byDate.entries()) {
            const uniqueReasons = [...new Set(exceptions.map((row) => row.reason))];
            const ids = exceptions.map((row) => row.id);
            const holidayReason = `Migrated from PO exception(s) ${ids.join(', ')}: ${uniqueReasons.join(' / ')}`;
            const holidayId = crypto.randomUUID();

            if (!dryRun) {
                await run(db, `
                    INSERT INTO auto_backfill_holiday_calendar
                        (id, business_date, reason, status, created_by, created_at)
                    VALUES (?, ?, ?, 'ACTIVE', ?, ?)
                `, [holidayId, businessDate, holidayReason, MIGRATION_ACTOR, now]);
                await run(db, `
                    INSERT INTO auto_backfill_holiday_calendar_event
                        (holiday_id, event_type, business_date, reason, actor, created_at)
                    VALUES (?, 'CREATED', ?, ?, ?, ?)
                `, [holidayId, businessDate, holidayReason, MIGRATION_ACTOR, now]);
            }
            holidaysCreated.push({ id: holidayId, business_date: businessDate, reason: holidayReason, migrated_from: ids });

            for (const exception of exceptions) {
                const revokeReason = `${MIGRATION_REVOKE_REASON} (holiday ${holidayId})`;
                if (!dryRun) {
                    const updateResult = await run(db, `
                        UPDATE auto_backfill_coverage_exception
                        SET status = 'REVOKED', revoked_by = ?, revoked_at = ?, revoke_reason = ?
                        WHERE id = ? AND status = 'ACTIVE'
                    `, [MIGRATION_ACTOR, now, revokeReason, exception.id]);
                    if (updateResult.changes !== 1) {
                        throw new Error(`Expected to revoke exactly 1 row for exception ${exception.id}, revoked ${updateResult.changes}. Aborting transaction.`);
                    }
                    await run(db, `
                        INSERT INTO auto_backfill_coverage_exception_event
                            (exception_id, event_type, exception_type, indicator, source_lane, business_date, reason, actor, created_at)
                        VALUES (?, 'REVOKED', ?, ?, ?, ?, ?, ?, ?)
                    `, [exception.id, exception.exception_type, exception.indicator, exception.source_lane, exception.business_date, revokeReason, MIGRATION_ACTOR, now]);
                }
                exceptionsRevoked.push({ id: exception.id, indicator: exception.indicator, source_lane: exception.source_lane, business_date: exception.business_date, holiday_id: holidayId });
            }
        }
        if (!dryRun) await run(db, 'COMMIT');
    } catch (error) {
        if (!dryRun) {
            try {
                await run(db, 'ROLLBACK');
            } catch {
                // Preserve the original migration error over a rollback failure.
            }
        }
        throw error;
    }

    return { holidaysCreated, exceptionsRevoked };
}

async function main() {
    const argv = process.argv.slice(2);
    const dryRun = argv.includes('--dry-run');
    const dbPath = resolveDbPath(argv);
    const db = await openDb(dbPath);
    try {
        await run(db, 'PRAGMA foreign_keys=ON');
        const { byDate, conflicts, totalActiveExceptions } = await preflight(db);

        if (totalActiveExceptions === 0) {
            console.log(JSON.stringify({ status: 'NOOP', message: 'No ACTIVE coverage exceptions found; nothing to migrate.' }, null, 2));
            return;
        }

        if (conflicts.length > 0) {
            console.error(JSON.stringify({
                status: 'ABORTED_CONFLICT',
                message: 'One or more business_dates already carry an ACTIVE holiday. No write performed. Resolve manually and re-run.',
                conflicts,
            }, null, 2));
            process.exitCode = 1;
            return;
        }

        const result = await migrate({ db, byDate, dryRun });
        console.log(JSON.stringify({
            status: dryRun ? 'DRY_RUN_OK' : 'MIGRATED',
            dates_migrated: byDate.size,
            exceptions_revoked: result.exceptionsRevoked.length,
            holidays: result.holidaysCreated,
            revoked: result.exceptionsRevoked,
        }, null, 2));
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('[FAIL] AB-CALENDAR-01 exception-to-holiday migration failed:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { preflight, migrate, MIGRATION_ACTOR, MIGRATION_REVOKE_REASON };

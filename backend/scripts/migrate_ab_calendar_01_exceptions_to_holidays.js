/**
 * AB-CALENDAR-01 remediation -- migrate existing PO coverage exceptions to
 * the shared LỊCH NGHỈ calendar.
 *
 * ---------------------------------------------------------------------------
 * ONE-OFF, ALREADY EXECUTED. This script already ran against the live
 * database on 2026-08-27 (see manifest Section 42) and migrated exactly the
 * 8 exceptions / 6 dates PO explicitly reviewed and approved. It is kept in
 * the repository only as an audit record and as a safe replay tool (e.g.
 * against a restored backup), NOT as a general-purpose "migrate whatever is
 * currently ACTIVE" utility.
 *
 * A prior version of this script migrated every ACTIVE exception present at
 * run time. That is unsafe to keep around: if this file were ever re-run
 * after new, unrelated PO exceptions exist, it would convert them to shared
 * holidays without PO review. This version closes that gap structurally:
 *
 *   - Default execution is READ-ONLY. It reports what it finds and performs
 *     no writes under any circumstances unless the exact confirmation flag
 *     below is supplied.
 *   - Write eligibility is pinned to an immutable allowlist of the exact 8
 *     exception ids / 6 business_dates PO already approved and this script
 *     already migrated (`APPROVED_MIGRATION`, frozen below). No other
 *     exception, however it looks, can ever be written by this script.
 *   - Any ACTIVE exception that is NOT on the allowlist aborts the ENTIRE
 *     run before any write, in both read and write mode. A future,
 *     unrelated PO exception is therefore never silently skipped and never
 *     migrated -- its mere presence blocks this script from doing anything.
 *   - Because the allowlisted rows were already revoked by the 2026-08-27
 *     run, a write invocation today finds nothing left to migrate and
 *     returns NOOP; it can never "helpfully" pick up anything else.
 * ---------------------------------------------------------------------------
 *
 * Usage:
 *   node scripts/migrate_ab_calendar_01_exceptions_to_holidays.js [--db <path>]
 *       Read-only preflight. Never writes. Default and safe to run any time.
 *
 *   node scripts/migrate_ab_calendar_01_exceptions_to_holidays.js --db <path> --confirm-write=AB-CALENDAR-01-APPROVED-8
 *       Performs the write, and only ever for rows matching
 *       `APPROVED_MIGRATION` exactly. The confirmation value is a fixed
 *       constant, not a plain boolean flag, specifically so this cannot be
 *       triggered by an accidental `--confirm-write` typo or copy-paste.
 */
'use strict';

const crypto = require('node:crypto');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const MIGRATION_ACTOR = 'ab-calendar-01-migration';
const MIGRATION_REVOKE_REASON = 'Migrated to shared LỊCH NGHỈ';

// The exact confirmation token a caller must pass to permit any write. A
// bare boolean flag (`--confirm-write`) is deliberately not enough -- this
// reduces the chance of an accidental or copy-pasted invocation performing a
// write against a database this script was never reviewed against.
const REQUIRED_CONFIRMATION_TOKEN = 'AB-CALENDAR-01-APPROVED-8';

/**
 * The exact 8 `auto_backfill_coverage_exception` rows Product Owner reviewed
 * and approved on 2026-08-27 (manifest Section 42.2), and which this script
 * already migrated to 6 shared `auto_backfill_holiday_calendar` rows on the
 * same date (Section 42.4-42.5). Frozen and never appended to: a future,
 * separate PO-approved migration is a new ticket with its own allowlist, not
 * an edit to this one.
 */
const APPROVED_MIGRATION = Object.freeze([
    Object.freeze({ id: '849072f7-aeff-457e-ab85-f0112c3f4ba9', indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-02-17' }),
    Object.freeze({ id: '41f90c96-7363-488d-88e1-3cc5c7f60dda', indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-02-17' }),
    Object.freeze({ id: '4fc2a65b-9ff9-4a67-9059-70a4a2b5e8b4', indicator: 'F1.3', source_lane: 'HUE', business_date: '2026-02-18' }),
    Object.freeze({ id: 'e6f0e342-fdc1-4fb1-b9b3-29e16588f7e6', indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-02-18' }),
    Object.freeze({ id: 'a12fe35a-e0b3-4f57-8479-793cc648ab7c', indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-02-19' }),
    Object.freeze({ id: '78c8ecfa-b96c-4428-85fc-42a334b39794', indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-02-20' }),
    Object.freeze({ id: 'b9f758db-2d50-42b0-ad12-bf83621adc92', indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-02-21' }),
    Object.freeze({ id: '39ce3c4c-f56e-4521-a0c1-ee6a93a0447e', indicator: 'F1.3', source_lane: 'TCT', business_date: '2026-02-22' }),
]);

const APPROVED_BY_ID = new Map(APPROVED_MIGRATION.map((row) => [row.id, row]));

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, '../src/db/database.sqlite');
}

/**
 * Write is permitted only when the caller passes the exact required token as
 * `--confirm-write=<token>`. Anything else -- omitted, a bare flag with no
 * value, a wrong value -- leaves the run in read-only mode.
 */
function isWriteConfirmed(argv) {
    const prefix = '--confirm-write=';
    const flag = argv.find((arg) => arg.startsWith(prefix));
    if (!flag) return false;
    return flag.slice(prefix.length) === REQUIRED_CONFIRMATION_TOKEN;
}

/**
 * Opens the raw sqlite3.Database and wraps it in the same `{ run, get, all,
 * exec, close }` promisified shape used everywhere else in this codebase
 * (see `src/config/db.js` and every `AutoBackfill*Service`), so `plan()`,
 * `classify()` and `migrate()` below can be exercised against either a real
 * file or an in-memory test fixture built the same way.
 */
function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const raw = new sqlite3.Database(dbPath, (error) => {
            if (error) return reject(error);
            resolve({
                run: (sql, params = []) => new Promise((res, rej) => raw.run(sql, params, function onRun(err) {
                    if (err) rej(err);
                    else res(this);
                })),
                get: (sql, params = []) => new Promise((res, rej) => raw.get(sql, params, (err, row) => err ? rej(err) : res(row))),
                all: (sql, params = []) => new Promise((res, rej) => raw.all(sql, params, (err, rows) => err ? rej(err) : res(rows))),
                exec: (sql) => new Promise((res, rej) => raw.exec(sql, (err) => err ? rej(err) : res())),
                close: () => new Promise((res, rej) => raw.close((err) => err ? rej(err) : res())),
            });
        });
    });
}

/**
 * Classifies every currently ACTIVE exception against the immutable
 * allowlist, and never proceeds to a write plan if anything falls outside
 * it:
 *
 *   - `eligible`   -- ACTIVE, id is on the allowlist, and its indicator /
 *                     source_lane / business_date match the allowlist entry
 *                     exactly. Only these rows can ever be written.
 *   - `unexpected` -- ACTIVE and NOT on the allowlist at all. This is any
 *                     exception PO created before or after this ticket that
 *                     this script was never reviewed against -- most
 *                     importantly, any future exception. Its mere presence
 *                     aborts the whole run.
 *   - `mismatched` -- ACTIVE, id IS on the allowlist, but indicator /
 *                     source_lane / business_date differ from the approved
 *                     record. Should be structurally impossible (revoked
 *                     rows are immutable and ids are UUIDs), kept as
 *                     defense-in-depth. Also aborts the whole run.
 */
async function classify(db) {
    const activeExceptions = await db.all(`
        SELECT id, indicator, source_lane, business_date, exception_type, reason, created_by, created_at
        FROM auto_backfill_coverage_exception
        WHERE status = 'ACTIVE'
        ORDER BY business_date, indicator, source_lane
    `);

    const eligible = [];
    const unexpected = [];
    const mismatched = [];

    for (const row of activeExceptions) {
        const approved = APPROVED_BY_ID.get(row.id);
        if (!approved) {
            unexpected.push(row);
            continue;
        }
        if (approved.indicator !== row.indicator || approved.source_lane !== row.source_lane || approved.business_date !== row.business_date) {
            mismatched.push({ row, approved });
            continue;
        }
        eligible.push(row);
    }

    return { eligible, unexpected, mismatched, totalActive: activeExceptions.length };
}

/**
 * Additional guard once eligible rows are known: a holiday already ACTIVE
 * for one of their dates (from any source) would violate the calendar's
 * one-active-holiday-per-date invariant and must abort before any write.
 */
async function findHolidayConflicts(db, eligible) {
    const dates = [...new Set(eligible.map((row) => row.business_date))];
    const conflicts = [];
    for (const businessDate of dates) {
        const existingHoliday = await db.all(`
            SELECT id FROM auto_backfill_holiday_calendar WHERE business_date = ? AND status = 'ACTIVE'
        `, [businessDate]);
        if (existingHoliday.length > 0) {
            conflicts.push({ businessDate, reason: `an ACTIVE holiday (${existingHoliday[0].id}) already exists for this date` });
        }
    }
    return conflicts;
}

/**
 * Performs the write. Only ever called with the `eligible` set (allowlist
 * rows only) after every abort condition above found nothing.
 */
async function migrate({ db, eligible }) {
    const now = new Date().toISOString();
    const holidaysCreated = [];
    const exceptionsRevoked = [];

    const byDate = new Map();
    for (const row of eligible) {
        if (!byDate.has(row.business_date)) byDate.set(row.business_date, []);
        byDate.get(row.business_date).push(row);
    }

    await db.run('BEGIN TRANSACTION');
    try {
        for (const [businessDate, exceptions] of byDate.entries()) {
            const uniqueReasons = [...new Set(exceptions.map((row) => row.reason))];
            const ids = exceptions.map((row) => row.id);
            const holidayReason = `Migrated from PO exception(s) ${ids.join(', ')}: ${uniqueReasons.join(' / ')}`;
            const holidayId = crypto.randomUUID();

            await db.run(`
                INSERT INTO auto_backfill_holiday_calendar
                    (id, business_date, reason, status, created_by, created_at)
                VALUES (?, ?, ?, 'ACTIVE', ?, ?)
            `, [holidayId, businessDate, holidayReason, MIGRATION_ACTOR, now]);
            await db.run(`
                INSERT INTO auto_backfill_holiday_calendar_event
                    (holiday_id, event_type, business_date, reason, actor, created_at)
                VALUES (?, 'CREATED', ?, ?, ?, ?)
            `, [holidayId, businessDate, holidayReason, MIGRATION_ACTOR, now]);
            holidaysCreated.push({ id: holidayId, business_date: businessDate, reason: holidayReason, migrated_from: ids });

            for (const exception of exceptions) {
                const revokeReason = `${MIGRATION_REVOKE_REASON} (holiday ${holidayId})`;
                const updateResult = await db.run(`
                    UPDATE auto_backfill_coverage_exception
                    SET status = 'REVOKED', revoked_by = ?, revoked_at = ?, revoke_reason = ?
                    WHERE id = ? AND status = 'ACTIVE'
                `, [MIGRATION_ACTOR, now, revokeReason, exception.id]);
                if (updateResult.changes !== 1) {
                    throw new Error(`Expected to revoke exactly 1 row for exception ${exception.id}, revoked ${updateResult.changes}. Aborting transaction.`);
                }
                await db.run(`
                    INSERT INTO auto_backfill_coverage_exception_event
                        (exception_id, event_type, exception_type, indicator, source_lane, business_date, reason, actor, created_at)
                    VALUES (?, 'REVOKED', ?, ?, ?, ?, ?, ?, ?)
                `, [exception.id, exception.exception_type, exception.indicator, exception.source_lane, exception.business_date, revokeReason, MIGRATION_ACTOR, now]);
                exceptionsRevoked.push({ id: exception.id, indicator: exception.indicator, source_lane: exception.source_lane, business_date: exception.business_date, holiday_id: holidayId });
            }
        }
        await db.run('COMMIT');
    } catch (error) {
        try {
            await db.run('ROLLBACK');
        } catch {
            // Preserve the original migration error over a rollback failure.
        }
        throw error;
    }

    return { holidaysCreated, exceptionsRevoked };
}

/**
 * The single entry point every mode (default read-only, and confirmed
 * write) goes through, so the abort conditions can never be bypassed by one
 * code path and not the other.
 */
async function plan(db) {
    const { eligible, unexpected, mismatched, totalActive } = await classify(db);

    if (unexpected.length > 0) {
        return {
            status: 'ABORTED_UNEXPECTED_ACTIVE_EXCEPTION',
            message: 'One or more ACTIVE exceptions are not on the approved allowlist. No write performed, and none ever will be by this script. Review manually; this script cannot migrate anything outside APPROVED_MIGRATION.',
            unexpected: unexpected.map((row) => ({ id: row.id, indicator: row.indicator, source_lane: row.source_lane, business_date: row.business_date, reason: row.reason })),
        };
    }

    if (mismatched.length > 0) {
        return {
            status: 'ABORTED_ALLOWLIST_MISMATCH',
            message: 'An ACTIVE exception id is on the allowlist but its indicator/lane/date no longer match the approved record. No write performed.',
            mismatched: mismatched.map(({ row, approved }) => ({ id: row.id, found: { indicator: row.indicator, source_lane: row.source_lane, business_date: row.business_date }, approved: { indicator: approved.indicator, source_lane: approved.source_lane, business_date: approved.business_date } })),
        };
    }

    if (eligible.length === 0) {
        return {
            status: 'NOOP',
            message: totalActive === 0
                ? 'No ACTIVE coverage exceptions found; nothing to migrate.'
                : 'No ACTIVE exceptions remain on the approved allowlist (already migrated); nothing to do.',
        };
    }

    const conflicts = await findHolidayConflicts(db, eligible);
    if (conflicts.length > 0) {
        return {
            status: 'ABORTED_HOLIDAY_CONFLICT',
            message: 'One or more approved business_dates already carry an ACTIVE holiday from another source. No write performed.',
            conflicts,
        };
    }

    return {
        status: 'READY',
        eligible: eligible.map((row) => ({ id: row.id, indicator: row.indicator, source_lane: row.source_lane, business_date: row.business_date })),
    };
}

async function main() {
    const argv = process.argv.slice(2);
    const dbPath = resolveDbPath(argv);
    const writeConfirmed = isWriteConfirmed(argv);
    const db = await openDb(dbPath);
    try {
        await db.run('PRAGMA foreign_keys=ON');
        const planResult = await plan(db);

        if (planResult.status !== 'READY') {
            console.log(JSON.stringify(planResult, null, 2));
            if (planResult.status.startsWith('ABORTED_')) process.exitCode = 1;
            return;
        }

        if (!writeConfirmed) {
            console.log(JSON.stringify({
                status: 'DRY_RUN_PREFLIGHT',
                message: `Read-only mode (default). ${planResult.eligible.length} approved-allowlist exception(s) are eligible to migrate. Re-run with --confirm-write=${REQUIRED_CONFIRMATION_TOKEN} to write.`,
                eligible: planResult.eligible,
            }, null, 2));
            return;
        }

        const { eligible } = await classify(db);
        const result = await migrate({ db, eligible });
        console.log(JSON.stringify({
            status: 'MIGRATED',
            dates_migrated: new Set(result.exceptionsRevoked.map((row) => row.business_date)).size,
            exceptions_revoked: result.exceptionsRevoked.length,
            holidays: result.holidaysCreated,
            revoked: result.exceptionsRevoked,
        }, null, 2));
    } finally {
        await db.close();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('[FAIL] AB-CALENDAR-01 exception-to-holiday migration failed:', error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    plan,
    classify,
    migrate,
    isWriteConfirmed,
    APPROVED_MIGRATION,
    REQUIRED_CONFIRMATION_TOKEN,
    MIGRATION_ACTOR,
    MIGRATION_REVOKE_REASON,
};

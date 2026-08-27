'use strict';

const crypto = require('node:crypto');
const { BUSINESS_TIMEZONE } = require('./importIndicatorRegistry');
const { normalizeBusinessDate, formatDateInTimezone, addUtcDays } = require('./autoBackfillBusinessCalendar');

/**
 * AB-CALENDAR-01 -- LỊCH NGHỈ.
 *
 * A holiday is recorded once per `business_date` with no indicator and no
 * source lane, and is consumed by `AutoBackfillCoverageService.scan()` as a
 * *derived overlay*: it is never persisted per tuple, so the moment real data
 * lands for that day the day reverts to its true coverage state without any
 * revoke being required.
 *
 * This service is deliberately separate from
 * `AutoBackfillCoverageExceptionService`: LỊCH NGHỈ must never reach
 * `auto_backfill_coverage_exception`, `validateAdapterProof()`, or any other
 * coverage-exception code path (design Section 7, R3). Keeping the two
 * services apart makes that guarantee structural rather than a convention.
 */

function holidayError(code, message, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function mapHolidayRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        business_date: row.business_date,
        reason: row.reason,
        status: row.status,
        created_by: row.created_by,
        created_at: row.created_at,
        revoked_by: row.revoked_by || null,
        revoked_at: row.revoked_at || null,
        revoke_reason: row.revoke_reason || null,
    };
}

class AutoBackfillHolidayCalendarService {
    constructor({
        db = null,
        clock = () => new Date(),
        businessTimezone = BUSINESS_TIMEZONE,
    } = {}) {
        this.db = db || require('../config/db');
        this.clock = clock;
        this.businessTimezone = businessTimezone;
    }

    /**
     * The latest business date a holiday may be recorded for: N-1 on the
     * backend business clock, matching the coverage window's `to_date`. A
     * future-dated holiday would be invisible to every scan until the day
     * passed, so it is rejected outright rather than stored silently.
     *
     * Unlike `AutoBackfillCoverageExceptionService.resolveTuple()`, there is
     * deliberately NO lower bound: the calendar is indicator-agnostic and a
     * holiday may legitimately predate one indicator's trackingStartDate
     * while postdating another's.
     */
    latestRecordableDate() {
        return addUtcDays(formatDateInTimezone(this.clock(), this.businessTimezone), -1);
    }

    /** Mirrors `AutoBackfillCoverageExceptionService.withTransaction()`. */
    async withTransaction(fn) {
        await this.db.run('BEGIN TRANSACTION');
        try {
            const result = await fn();
            await this.db.run('COMMIT');
            return result;
        } catch (error) {
            try {
                await this.db.run('ROLLBACK');
            } catch {
                // Preserve the original transaction error over a rollback failure.
            }
            throw error;
        }
    }

    async create({ businessDate, reason, actor }) {
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason) {
            throw holidayError('HOLIDAY_REASON_REQUIRED', 'reason is required and cannot be empty.');
        }
        if (!actor) throw holidayError('HOLIDAY_ACTOR_REQUIRED', 'An authenticated actor is required.');

        const normalizedDate = normalizeBusinessDate(businessDate, 'business_date');
        const toDate = this.latestRecordableDate();
        if (normalizedDate > toDate) {
            throw holidayError(
                'HOLIDAY_BUSINESS_DATE_IN_FUTURE',
                `business_date must not be later than ${toDate}; a future holiday is invisible to coverage.`,
            );
        }

        const existing = await this.db.get(
            `SELECT id FROM auto_backfill_holiday_calendar WHERE business_date = ? AND status = 'ACTIVE'`,
            [normalizedDate],
        );
        if (existing) {
            throw holidayError(
                'HOLIDAY_ALREADY_ACTIVE',
                `${normalizedDate} is already marked as LỊCH NGHỈ; revoke it before recording a new one.`,
                409,
            );
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await this.withTransaction(async () => {
            await this.db.run(
                `INSERT INTO auto_backfill_holiday_calendar
                    (id, business_date, reason, status, created_by, created_at)
                 VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
                [id, normalizedDate, trimmedReason, actor, now],
            );
            await this.db.run(
                `INSERT INTO auto_backfill_holiday_calendar_event
                    (holiday_id, event_type, business_date, reason, actor, created_at)
                 VALUES (?, 'CREATED', ?, ?, ?, ?)`,
                [id, normalizedDate, trimmedReason, actor, now],
            );
        });

        return this.getById(id);
    }

    async revoke({ holidayId, reason, actor }) {
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason) throw holidayError('HOLIDAY_REVOKE_REASON_REQUIRED', 'A revoke reason is required.');
        if (!actor) throw holidayError('HOLIDAY_ACTOR_REQUIRED', 'An authenticated actor is required.');

        const row = await this.db.get('SELECT * FROM auto_backfill_holiday_calendar WHERE id = ?', [holidayId]);
        if (!row) throw holidayError('HOLIDAY_NOT_FOUND', `Holiday '${holidayId}' does not exist.`, 404);
        if (row.status !== 'ACTIVE') {
            throw holidayError('HOLIDAY_NOT_ACTIVE', `Holiday '${holidayId}' is already ${row.status}.`, 409);
        }

        const now = new Date().toISOString();
        await this.withTransaction(async () => {
            await this.db.run(
                `UPDATE auto_backfill_holiday_calendar
                 SET status = 'REVOKED', revoked_by = ?, revoked_at = ?, revoke_reason = ?
                 WHERE id = ? AND status = 'ACTIVE'`,
                [actor, now, trimmedReason, holidayId],
            );
            await this.db.run(
                `INSERT INTO auto_backfill_holiday_calendar_event
                    (holiday_id, event_type, business_date, reason, actor, created_at)
                 VALUES (?, 'REVOKED', ?, ?, ?, ?)`,
                [holidayId, row.business_date, trimmedReason, actor, now],
            );
        });

        return this.getById(holidayId);
    }

    async getById(holidayId) {
        const row = await this.db.get('SELECT * FROM auto_backfill_holiday_calendar WHERE id = ?', [holidayId]);
        if (!row) throw holidayError('HOLIDAY_NOT_FOUND', `Holiday '${holidayId}' does not exist.`, 404);
        const events = await this.db.all(
            'SELECT * FROM auto_backfill_holiday_calendar_event WHERE holiday_id = ? ORDER BY id ASC',
            [holidayId],
        );
        return {
            ...mapHolidayRow(row),
            events: events.map((event) => ({
                event_type: event.event_type,
                reason: event.reason,
                actor: event.actor,
                created_at: event.created_at,
            })),
        };
    }

    async list({ fromDate = null, toDate = null, status = null } = {}) {
        const statusFilter = status ? String(status).trim().toUpperCase() : null;
        if (statusFilter && !['ACTIVE', 'REVOKED'].includes(statusFilter)) {
            throw holidayError('HOLIDAY_STATUS_INVALID', "status must be 'ACTIVE' or 'REVOKED'.");
        }

        const clauses = [];
        const params = [];
        if (fromDate) { clauses.push('business_date >= ?'); params.push(normalizeBusinessDate(fromDate, 'from')); }
        if (toDate) { clauses.push('business_date <= ?'); params.push(normalizeBusinessDate(toDate, 'to')); }
        if (statusFilter) { clauses.push('status = ?'); params.push(statusFilter); }
        const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

        const rows = await this.db.all(
            `SELECT * FROM auto_backfill_holiday_calendar ${where} ORDER BY business_date DESC`,
            params,
        );
        return { total: rows.length, items: rows.map(mapHolidayRow) };
    }

    /**
     * Batch-load ACTIVE holidays as a `business_date` -> holiday map for the
     * coverage scanner's overlay. Mirrors
     * `AutoBackfillCoverageExceptionService.loadActiveExceptionMap()`,
     * including its safe degradation: returns an empty map whenever the
     * injected db does not expose `.all` (unit-test doubles).
     *
     * It additionally degrades when the calendar table itself is absent. LỊCH
     * NGHỈ is an additive overlay on a coverage scan that predates it, so a
     * database that has not run the AB-CALENDAR-01 migration yet must still
     * scan normally -- it simply has no holidays. Every other database error
     * is rethrown untouched.
     */
    async loadActiveHolidayMap({ fromDate = null, toDate = null } = {}) {
        const map = new Map();
        if (typeof this.db?.all !== 'function') return map;
        const clauses = [`status = 'ACTIVE'`];
        const params = [];
        if (fromDate) { clauses.push('business_date >= ?'); params.push(fromDate); }
        if (toDate) { clauses.push('business_date <= ?'); params.push(toDate); }
        let rows;
        try {
            rows = await this.db.all(
                `SELECT * FROM auto_backfill_holiday_calendar WHERE ${clauses.join(' AND ')}`,
                params,
            );
        } catch (error) {
            if (/no such table: auto_backfill_holiday_calendar/i.test(String(error?.message || ''))) return map;
            throw error;
        }
        for (const row of rows) map.set(row.business_date, mapHolidayRow(row));
        return map;
    }
}

module.exports = {
    AutoBackfillHolidayCalendarService,
};

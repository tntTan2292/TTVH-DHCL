'use strict';

// F13-WHY-AGG-01 Phase 1: builds the derived per-parcel cause table `f13_cause_parcel` day by day.
// There is one implementation of the rules: every row comes from JourneyService._parcels (called city-wide, no scope: T3).
// A day is rebuilt in ONE transaction (delete the day's rows, insert, upsert f13_cause_day), so a reader sees the old day or the
// new one; a failing day keeps its previous rows and is marked STALE with the error. Design: F13-WHY-AGG-01_DESIGN_OF_RECORD.md sections 5 and 8.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DAYS_BEFORE, DAYS_AFTER, BF_EXTRA_DAYS, shiftIsoDate } = require('./JourneyService');
const { CONFIRMED_NON_POSTMAN_ROUTE_CODES, isConfirmedNonPostmanRoute } = require('../../config/f13RouteClassificationCatalog');

const ROUTE_SCOPES = Object.freeze({ POSTMAN: 'POSTMAN', NON_POSTMAN: 'NON_POSTMAN', OTHER: 'OTHER' });
const DAY_STATES = Object.freeze({ FRESH: 'FRESH', STALE: 'STALE', BUILDING: 'BUILDING' });
const ABANDON_AFTER_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const FAILED = 'Không đạt';

// The source tables a day depends on and the date column of each (JourneyService reads exactly these windows).
const SOURCES = Object.freeze([
    { key: 'f13', table: 'fact_f13', dateColumn: 'ngay_do_kiem', window: 'main' },
    { key: 'f41', table: 'fact_f41', dateColumn: 'ngay_do_kiem', window: 'main' },
    { key: 'f42', table: 'fact_f42', dateColumn: 'ngay_do_kiem', window: 'main' },
    { key: 'f11', table: 'fact_f11', dateColumn: 'ngay_do_kiem', window: 'main' },
    { key: 'bf', table: 'fact_bf_phat', dateColumn: 'ngay_bf', window: 'bf' },
]);

// The rules and everything that feeds them: a change in any of these marks every built day stale (F13-WHY-DATA-02 added the thresholds and the repository).
const VERSION_FILES = ['CauseClassifier.js', 'tctIntervals.js', 'JourneyService.js', '../../config/f13CauseConfig.js', '../../repositories/F13JourneyRepository.js'];

/** SHA-256 of the sources of the rules plus the confirmed non-postman route codes (T1). Line endings are normalised. */
function computeClassifierVersion() {
    const hash = crypto.createHash('sha256');
    for (const file of VERSION_FILES) {
        hash.update(`${file}\n`);
        hash.update(fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n'));
        hash.update('\n');
    }
    hash.update(`routes:${[...CONFIRMED_NON_POSTMAN_ROUTE_CODES].sort().join(',')}`);
    return hash.digest('hex');
}

/** POSTMAN = a Huế route (53...) that is not a confirmed non-postman code; NON_POSTMAN = a confirmed code; OTHER = empty or not 53... */
function routeScopeOf(maTuyen) {
    const code = String(maTuyen ?? '');
    if (isConfirmedNonPostmanRoute(code)) return ROUTE_SCOPES.NON_POSTMAN;
    if (code.startsWith('53')) return ROUTE_SCOPES.POSTMAN;
    return ROUTE_SCOPES.OTHER;
}

/** The days that JourneyService._parcels(date) reads, from its own constants. */
function windowFor(date) {
    const from = shiftIsoDate(date, -DAYS_BEFORE);
    const to = shiftIsoDate(date, DAYS_AFTER);
    return { from, to, bfTo: shiftIsoDate(to, BF_EXTRA_DAYS) };
}

function listText(values) {
    return Array.isArray(values) && values.length ? values.join(',') : null;
}

/** A leg of a JourneyService parcel (hours) in whole ms; null when the leg is not computable. */
function legMs(parcel, leg) {
    const hours = parcel.legs ? parcel.legs[leg] : null;
    return hours === null || hours === undefined ? null : Math.round(hours * 3600000);
}

/** Maps one JourneyService parcel to a table row (all stored fields; nothing recomputed). */
function toRow(date, parcel, builtAt, classifierVersion) {
    const detail = parcel.cause_detail || {};
    return {
        ngay_do_kiem: date,
        ma_bg: parcel.ma_bg,
        ma_bcvh: String(parcel.ma_bcvh),
        ma_tuyen: parcel.ma_tuyen,
        route_scope: routeScopeOf(parcel.ma_tuyen),
        ma_buu_ta_first: parcel.ma_buu_ta_first,
        ten_buu_ta_first: parcel.ten_buu_ta_first,
        ma_buu_ta_shown: parcel.ma_buu_ta,
        ten_buu_ta_shown: parcel.ten_buu_ta,
        danh_gia: parcel.danh_gia,
        cause_code: parcel.cause ? parcel.cause.code : null,
        cause_status: parcel.cause_status,
        cause_step: parcel.cause_step,
        flags: listText(parcel.flags),
        hints: listText(parcel.hints),
        ma_lo: parcel.ma_lo,
        khong_tron_lo: parcel.khong_tron_lo ? 1 : 0,
        cause_detail: parcel.cause ? (parcel.cause.detail ?? null) : null,
        cause_reason: parcel.cause_reason ?? null,
        remaining_at_arrival_ms: parcel.remaining_at_arrival_ms ?? null,
        a_source: parcel.a_source ?? null,
        basis: parcel.cause_basis ?? null,
        limit_ms: detail.limit_ms ?? null,
        tct_ms: detail.tct_ms ?? null,
        l_ms: detail.l_ms ?? null,
        r_ms: detail.r_ms ?? null,
        // F13-JOURNEY-ROUTE-02 B2: the legs JourneyService computed (hours, 2 decimals) kept in ms; nothing recomputed here
        leg_tms_depart_ms: legMs(parcel, 'tms_depart'),
        leg_depart_arrive_ms: legMs(parcel, 'depart_arrive'),
        leg_tms_arrive_ms: legMs(parcel, 'tms_arrive'),
        leg_arrive_gbt_ms: legMs(parcel, 'arrive_gbt'),
        leg_gbt_ptc_ms: legMs(parcel, 'gbt_ptc'),
        leg_tms_ptc_ms: legMs(parcel, 'tms_ptc'),
        built_at: builtAt,
        classifier_version: classifierVersion,
    };
}

const ROW_COLUMNS = [
    'ngay_do_kiem', 'ma_bg', 'ma_bcvh', 'ma_tuyen', 'route_scope', 'ma_buu_ta_first', 'ten_buu_ta_first', 'ma_buu_ta_shown', 'ten_buu_ta_shown',
    'danh_gia', 'cause_code', 'cause_status', 'cause_step', 'flags', 'hints', 'ma_lo', 'khong_tron_lo', 'limit_ms', 'tct_ms', 'l_ms', 'r_ms',
    'built_at', 'classifier_version', 'cause_detail', 'cause_reason', 'remaining_at_arrival_ms', 'a_source', 'basis',
    'leg_tms_depart_ms', 'leg_depart_arrive_ms', 'leg_tms_arrive_ms', 'leg_arrive_gbt_ms', 'leg_gbt_ptc_ms', 'leg_tms_ptc_ms',
];

/** Signature of one day over a db offering get(sql, params). A source table that does not exist counts as 0 rows (a partial test or fresh database). */
async function computeDaySignature(db, date) {
    const { from, to, bfTo } = windowFor(date);
    const parts = [];
    for (const source of SOURCES) {
        const upper = source.window === 'bf' ? bfTo : to;
        let row;
        try {
            row = await db.get(`SELECT COUNT(*) AS c, MAX(id) AS m FROM ${source.table} WHERE ${source.dateColumn} BETWEEN ? AND ?`, [from, upper]);
        } catch (error) {
            if (!/no such table/i.test(String(error.message))) throw error;
            row = { c: 0, m: null };
        }
        parts.push(`${source.key}:${row.c}:${row.m ?? 0}`);
    }
    return parts.join('|');
}

/**
 * Signatures of many days with ONE GROUP BY-day query per source over the whole needed range; each day's window is derived in memory.
 * Same strings as computeDaySignature (P3-R1). `days` are ISO dates; returns Map day -> signature.
 */
async function computeSignaturesForDays(db, days) {
    const result = new Map();
    if (!days.length) return result;
    const sorted = [...days].sort();
    const first = windowFor(sorted[0]);
    const last = windowFor(sorted[sorted.length - 1]);
    const perSource = [];
    for (const source of SOURCES) {
        const lo = first.from;
        const hi = source.window === 'bf' ? last.bfTo : last.to;
        let rows;
        try {
            rows = await db.all(
                `SELECT ${source.dateColumn} AS d, COUNT(*) AS c, MAX(id) AS m FROM ${source.table} WHERE ${source.dateColumn} BETWEEN ? AND ? GROUP BY ${source.dateColumn}`,
                [lo, hi],
            );
        } catch (error) {
            if (!/no such table/i.test(String(error.message))) throw error;
            rows = [];
        }
        perSource.push(rows.map((row) => ({ d: row.d, c: Number(row.c), m: Number(row.m ?? 0) })).sort((a, b) => (a.d < b.d ? -1 : 1)));
    }
    for (const day of sorted) {
        const { from, to, bfTo } = windowFor(day);
        const parts = SOURCES.map((source, index) => {
            const upper = source.window === 'bf' ? bfTo : to;
            let count = 0;
            let max = 0;
            for (const entry of perSource[index]) {
                if (entry.d < from) continue;
                if (entry.d > upper) break;
                count += entry.c;
                if (entry.m > max) max = entry.m;
            }
            return `${source.key}:${count}:${max}`;
        });
        result.set(day, parts.join('|'));
    }
    return result;
}

function wrapDb(db) {
    return {
        run: (sql, params = []) => new Promise((resolve, reject) => {
            db.run(sql, params, function onRun(error) { return error ? reject(error) : resolve(this); });
        }),
        get: (sql, params = []) => new Promise((resolve, reject) => {
            db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
        }),
        all: (sql, params = []) => new Promise((resolve, reject) => {
            db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
        }),
        prepare: (sql) => new Promise((resolve, reject) => {
            const statement = db.prepare(sql, (error) => (error ? reject(error) : resolve(statement)));
        }),
    };
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One writer at a time in this process. A second request while a run is active adds its days to that run (never a parallel run).
let activeRun = null;

class CauseAggBuilder {
    /**
     * @param {object} options
     *   db               sqlite3 Database used for the derived tables and the signature (the writer)
     *   journeyService   JourneyService over the source tables (reader); only _parcels(date) is called, without scope
     */
    constructor({ db, journeyService, classifierVersion = null, now = () => new Date(), sleep = defaultSleep, retryPauseMs = 2000, logger = console, quietGate = null } = {}) {
        if (!db) throw new Error('CauseAggBuilder needs a db');
        if (!journeyService) throw new Error('CauseAggBuilder needs a journeyService');
        this.db = wrapDb(db);
        this.journeyService = journeyService;
        this.classifierVersion = classifierVersion || computeClassifierVersion();
        this.now = now;
        this.sleep = sleep;
        this.retryPauseMs = retryPauseMs;
        this.logger = logger;
        this.quietGate = quietGate; // async () => resolves when no import transaction is open (Design 8 rule 2)
    }

    windowFor(date) {
        return windowFor(date);
    }

    /** Input signature of a day: row count and MAX(id) of every source over the day's window (ids are never reused: delete + insert changes it). */
    async computeSignature(date) {
        return computeDaySignature(this.db, date);
    }

    /** Marks FRESH days in from..to STALE (reason in `error`) so a reader and the next run see them as pending; BUILDING days are left alone. */
    async markStale(from, to, reason) {
        const result = await this.db.run(
            `UPDATE f13_cause_day SET state = 'STALE', error = ? WHERE ngay_do_kiem BETWEEN ? AND ? AND state = 'FRESH'`,
            [reason, from, to],
        );
        return result.changes || 0;
    }

    /** Shadow check (P3 f): rebuilds the day on the fly with the same path and compares it with the stored rows (built_at ignored). */
    async compareDay(date) {
        const parcels = await this.journeyService._parcels(date);
        const fresh = new Map(parcels.map((parcel) => [parcel.ma_bg, toRow(date, parcel, 'x', 'x')]));
        const stored = await this.db.all('SELECT * FROM f13_cause_parcel WHERE ngay_do_kiem = ?', [date]);
        const storedBy = new Map(stored.map((row) => [row.ma_bg, row]));
        const differences = [];
        for (const [maBg, expected] of fresh) {
            const row = storedBy.get(maBg);
            if (!row) { differences.push({ ma_bg: maBg, field: '(missing row)' }); continue; }
            for (const column of ROW_COLUMNS) {
                if (column === 'built_at' || column === 'classifier_version') continue;
                if ((row[column] ?? null) !== (expected[column] ?? null)) differences.push({ ma_bg: maBg, field: column, stored: row[column] ?? null, onTheFly: expected[column] ?? null });
            }
        }
        for (const maBg of storedBy.keys()) if (!fresh.has(maBg)) differences.push({ ma_bg: maBg, field: '(extra row)' });
        return { date, rows: fresh.size, stored: stored.length, differences };
    }

    async _upsertDay(date, { signature, state, builtAt, error, rowCount, keepSignature = false }) {
        if (keepSignature) {
            await this.db.run(
                `INSERT INTO f13_cause_day (ngay_do_kiem, input_signature, classifier_version, state, built_at, error, row_count)
                 VALUES (?, NULL, NULL, ?, NULL, ?, 0)
                 ON CONFLICT(ngay_do_kiem) DO UPDATE SET state = excluded.state, error = excluded.error`,
                [date, state, error ?? null],
            );
            return;
        }
        await this.db.run(
            `INSERT INTO f13_cause_day (ngay_do_kiem, input_signature, classifier_version, state, built_at, error, row_count)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(ngay_do_kiem) DO UPDATE SET input_signature = excluded.input_signature, classifier_version = excluded.classifier_version,
                 state = excluded.state, built_at = excluded.built_at, error = excluded.error, row_count = excluded.row_count`,
            [date, signature, this.classifierVersion, state, builtAt, error ?? null, rowCount],
        );
    }

    /**
     * Rebuilds one day. Reads first (signature, then the parcels), writes in one transaction. On any error the day keeps its old rows
     * and is marked STALE with the message; the error is rethrown.
     */
    async buildDay(date) {
        const started = Date.now();
        if (this.quietGate) await this.quietGate();
        try {
            await this._upsertDay(date, { state: DAY_STATES.BUILDING, keepSignature: true });
            // The signature is taken BEFORE the parcels are read: an import landing in between leaves the stored signature older than the data,
            // so the day is seen as stale later instead of being trusted.
            const signature = await this.computeSignature(date);
            const parcels = await this.journeyService._parcels(date); // city-wide on purpose (T3): lot volumes must not depend on an account
            const builtAt = this.now().toISOString();
            const rows = parcels.map((parcel) => toRow(date, parcel, builtAt, this.classifierVersion));
            await this._writeDay(date, rows, signature, builtAt);
            return { date, rows: rows.length, ms: Date.now() - started, signature };
        } catch (error) {
            try {
                await this._upsertDay(date, { state: DAY_STATES.STALE, error: String(error.message || error).slice(0, 500), keepSignature: true });
            } catch { /* keep the original error */ }
            throw error;
        }
    }

    async _writeDay(date, rows, signature, builtAt) {
        await this.db.run('BEGIN IMMEDIATE');
        try {
            await this.db.run('DELETE FROM f13_cause_parcel WHERE ngay_do_kiem = ?', [date]);
            if (rows.length) {
                const statement = await this.db.prepare(
                    `INSERT INTO f13_cause_parcel (${ROW_COLUMNS.join(', ')}) VALUES (${ROW_COLUMNS.map(() => '?').join(', ')})`,
                );
                try {
                    for (const row of rows) {
                        await new Promise((resolve, reject) => {
                            statement.run(ROW_COLUMNS.map((column) => row[column]), (error) => (error ? reject(error) : resolve()));
                        });
                    }
                } finally {
                    await new Promise((resolve) => statement.finalize(() => resolve()));
                }
            }
            await this._upsertDay(date, { signature, state: DAY_STATES.FRESH, builtAt, error: null, rowCount: rows.length });
            await this.db.run('COMMIT');
        } catch (error) {
            try { await this.db.run('ROLLBACK'); } catch { /* keep the original error */ }
            throw error;
        }
    }

    /** Calendar days between from and to (inclusive) that have F1.3 rows, or an f13_cause_day row (so a vanished day is cleaned). */
    async daysInRange(from, to) {
        const rows = await this.db.all(
            `SELECT ngay_do_kiem AS d FROM fact_f13 WHERE ngay_do_kiem BETWEEN ? AND ? AND ngay_do_kiem IS NOT NULL
             UNION SELECT ngay_do_kiem FROM f13_cause_day WHERE ngay_do_kiem BETWEEN ? AND ?
             ORDER BY 1`,
            [from, to, from, to],
        );
        return rows.map((row) => row.d);
    }

    /** 'rebuild' = every day; 'build' = the days that are missing, not FRESH, built by another classifier version or whose signature moved. */
    async selectDays(from, to, mode) {
        const days = await this.daysInRange(from, to);
        if (mode === 'rebuild') return days;
        const selected = [];
        for (const day of days) {
            const state = await this.db.get('SELECT * FROM f13_cause_day WHERE ngay_do_kiem = ?', [day]);
            if (!state || state.state !== DAY_STATES.FRESH || state.classifier_version !== this.classifierVersion
                || state.input_signature !== await this.computeSignature(day)) selected.push(day);
        }
        return selected;
    }

    async _abandonStaleRuns() {
        const limit = new Date(this.now().getTime() - ABANDON_AFTER_MS).toISOString();
        await this.db.run(
            `UPDATE f13_cause_run SET status = 'ABANDONED', ended_at = ? WHERE status = 'RUNNING' AND heartbeat_at < ?`,
            [this.now().toISOString(), limit],
        );
    }

    async _buildWithRetry(day) {
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
            try {
                return await this.buildDay(day);
            } catch (error) {
                lastError = error;
                if (attempt < MAX_ATTEMPTS) await this.sleep(this.retryPauseMs);
            }
        }
        throw lastError;
    }

    /**
     * Runs a build or rebuild over from..to and records it in f13_cause_run. While a run is active in this process a second call adds its
     * days to that run and returns its promise (`joined: true`): two builds never run at once.
     * @returns {Promise<{runId, status, daysDone, daysFailed, results: Array, joined?: boolean}>}
     */
    async run({ from, to, mode = 'build', trigger = 'manual' }) {
        if (!['build', 'rebuild'].includes(mode)) throw new Error(`unknown mode ${mode}`);
        if (activeRun) {
            const running = activeRun;
            const days = await this.selectDays(from, to, mode);
            // Joining is only possible while the run still has a loop to pick the days up (check and push happen with no await between).
            if (activeRun === running && !running.closed) {
                for (const day of days) {
                    if (!running.queue.includes(day)) { running.queue.push(day); running.joined += 1; }
                }
                const outcome = await running.promise;
                return { ...outcome, joined: true };
            }
            await running.promise.catch(() => {});
            return this.run({ from, to, mode, trigger });
        }
        const state = { queue: [], closed: false, promise: null, joined: 0 };
        activeRun = state;
        state.promise = this._execute({ from, to, mode, trigger }, state)
            .finally(() => { activeRun = null; });
        return state.promise;
    }

    async _execute({ from, to, mode, trigger }, state) {
        await this._abandonStaleRuns();
        for (const day of await this.selectDays(from, to, mode)) if (!state.queue.includes(day)) state.queue.push(day);
        const startedAt = this.now().toISOString();
        const inserted = await this.db.run(
            `INSERT INTO f13_cause_run (trigger_source, from_day, to_day, days_done, days_failed, started_at, heartbeat_at, status)
             VALUES (?, ?, ?, 0, 0, ?, ?, 'RUNNING')`,
            [trigger, from, to, startedAt, startedAt],
        );
        const runId = inserted.lastID;
        const results = [];
        let done = 0;
        let failed = 0;
        let lastError = null;
        while (state.queue.length) {
            const day = state.queue.shift();
            try {
                results.push(await this._buildWithRetry(day));
                done += 1;
            } catch (error) {
                failed += 1;
                lastError = `${day}: ${error.message}`;
                results.push({ date: day, error: error.message });
            }
            await this.db.run('UPDATE f13_cause_run SET days_done = ?, days_failed = ?, days_joined = ?, heartbeat_at = ?, last_error = ? WHERE id = ?',
                [done, failed, state.joined, this.now().toISOString(), lastError, runId]);
        }
        state.closed = true; // synchronous with the loop's last check: a later request starts its own run
        const status = failed === 0 ? 'DONE' : (done === 0 ? 'FAILED' : 'PARTIAL');
        await this.db.run('UPDATE f13_cause_run SET status = ?, ended_at = ?, heartbeat_at = ?, days_done = ?, days_failed = ?, days_joined = ?, last_error = ? WHERE id = ?',
            [status, this.now().toISOString(), this.now().toISOString(), done, failed, state.joined, lastError, runId]);
        this.logger.log(`[f13-cause] run ${runId} ${status}: ${done} day(s) built, ${failed} failed, ${state.joined} joined (${from}..${to}, ${trigger})`);
        return { runId, status, daysDone: done, daysFailed: failed, daysJoined: state.joined, results };
    }
}

module.exports = {
    CauseAggBuilder,
    computeDaySignature,
    computeSignaturesForDays,
    wrapDb,
    ROUTE_SCOPES,
    DAY_STATES,
    SOURCES,
    ROW_COLUMNS,
    routeScopeOf,
    windowFor,
    toRow,
    computeClassifierVersion,
    DAYS_BEFORE,
    DAYS_AFTER,
    BF_EXTRA_DAYS,
};

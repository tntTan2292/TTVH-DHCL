'use strict';

// F13-JOURNEY-ROUTE-02 (B1 + B2): the journey routes and parcels over a PERIOD (Ngày / Tuần / Tháng), with the failed and the passed hours
// side by side, the cause of the failed parcels and the postmen of the period.
//
// B2: everything is read from the derived table `f13_cause_parcel` (the leg hours of each parcel are stored there by CauseAggBuilder in ms, the
// values JourneyService computed), like /why: no journey join per request. Nothing is recomputed from the rules:
//   - route_scope and the route key are the ones of the table / of /why/routes (POSTMAN: the route code, the other two: one group per BCVH,
//     '@NON_POSTMAN' / '@OTHER');
//   - own_shortfall is metricsOf of CauseAggQueryService from the same counters (9 N - 10 Đạt, never below 0);
//   - the cause mix of a route is read through CauseAggQueryService.routes() with the same period and scope as /why, so the numbers match.
// A day built before the leg / milestone columns existed has them NULL until the builder rewrites it: such days are listed in meta.legs.days_without_legs / days_without_milestones.

const { isRealDate } = require('./periodResolve');
const { CAUSES, PHAT_DETAILS } = require('./CauseClassifier');
const { CANONICAL_BCVH_UNITS } = require('../../config/canonicalBcvhUnits');
const { resolvePeriod, metricsOf, labelOfLine, lineOf, ROUTE_SCOPES } = require('./CauseAggQueryService');

const MAX_DAYS = 93; // a technical guard for the Hành trình pages (a quarter); not a business rule
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const FAILED = 'Không đạt';
const PASSED = 'Đạt';
const HOUR_MS = 3600000;
const LEGS = ['tms_depart', 'depart_arrive', 'tms_arrive', 'arrive_gbt', 'gbt_ptc', 'tms_ptc'];
const LEG_COLUMN = Object.fromEntries(LEGS.map((leg) => [leg, `leg_${leg}_ms`]));
const LEG_COLUMNS = LEGS.map((leg) => LEG_COLUMN[leg]);
const MILESTONE_COLUMNS = ['ms_tms', 'ms_depart', 'ms_arrive', 'ms_gbt', 'ms_gbt_first', 'ms_ptc'];
const STAGE_LEGS = ['tms_arrive', 'arrive_gbt', 'gbt_ptc']; // the three stages the slowest leg is picked from
const SCOPE_ORDER = { POSTMAN: 0, NON_POSTMAN: 1, OTHER: 2 };
const NON_POSTMAN_LABEL = 'Phát tại quầy (khách đến nhận)';
const OTHER_LABEL = 'Tuyến chưa xác định';
const BCVH_NAMES = Object.fromEntries(CANONICAL_BCVH_UNITS.map((unit) => [unit.ma_bcvh, unit.ten_bcvh]));
// parcel list: sort field -> column (the milestone fields keep the names of the old page)
const PARCEL_SORT_COLUMN = {
    tms: 'ms_tms', depart: 'ms_depart', arrive: 'ms_arrive', gbt: 'ms_gbt', gbt_first: 'ms_gbt_first', ptc: 'ms_ptc',
    ngay_do_kiem: 'ngay_do_kiem', ma_bg: 'ma_bg', ma_lo: 'ma_lo', danh_gia: 'danh_gia', ma_tuyen: 'ma_tuyen', ten_tuyen: 'ma_tuyen', ten_bcvh: 'ma_bcvh',
    ten_buu_ta: 'ten_buu_ta_shown', ...LEG_COLUMN,
};

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function shiftIsoDate(dateString, days) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/** The period of a request: `date` (= from = to) keeps working, else from+to / week / month like the other v2 endpoints. */
function resolveJourneyPeriod(query = {}) {
    const hasSelector = query.from !== undefined || query.to !== undefined || query.week !== undefined || query.month !== undefined;
    let period;
    if (query.date !== undefined && !hasSelector) {
        const date = String(query.date);
        if (!isRealDate(date)) throw fail('INVALID_DATE', 'date must be a valid date in YYYY-MM-DD format');
        period = { kind: 'day', from: date, to: date, days: 1 };
    } else if (query.date !== undefined) {
        throw fail('MISSING_PARAM', 'Chỉ dùng một trong date, from+to, week, month');
    } else {
        period = resolvePeriod(query); // MISSING_PARAM / INVALID_DATE / INVALID_RANGE / INVALID_WEEK_ID / INVALID_MONTH_ID
    }
    if (period.days > MAX_DAYS) throw fail('RANGE_TOO_LONG', `Hành trình xem tối đa ${MAX_DAYS} ngày`);
    return period;
}

function wrapDb(db) {
    if (typeof db.serialize === 'function') { // a sqlite3 Database (callback style)
        return {
            all: (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)))),
            // streams the rows: the caller keeps only what it aggregates
            each: (sql, params, onRow) => new Promise((resolve, reject) => {
                let failure = null;
                db.each(sql, params, (error, row) => { if (!error && !failure) { try { onRow(row); } catch (thrown) { failure = thrown; } } }, (error) => (error || failure ? reject(error || failure) : resolve()));
            }),
        };
    }
    if (!db.each) return { ...db, each: async (sql, params, onRow) => { for (const row of await db.all(sql, params)) onRow(row); } };
    return db;
}

/** The WHERE of the period and the scope: the same rules as the cause layer (a BCVH account sees its allowed units only). */
function whereOf(period, scope = {}) {
    const clauses = ['ngay_do_kiem BETWEEN ? AND ?'];
    const params = [period.from, period.to];
    const bcvhId = scope.bcvhId ? String(scope.bcvhId) : null;
    const allowed = Array.isArray(scope.allowedCodes) ? scope.allowedCodes.map(String) : null;
    if (bcvhId) {
        if (allowed && !allowed.includes(bcvhId)) clauses.push('0 = 1'); // nothing of another unit (the controller refuses it earlier with 403)
        else { clauses.push('ma_bcvh = ?'); params.push(bcvhId); }
    } else if (allowed) {
        if (allowed.length === 0) clauses.push('0 = 1');
        else { clauses.push(`ma_bcvh IN (${allowed.map(() => '?').join(', ')})`); params.push(...allowed); }
    }
    return { sql: clauses.join(' AND '), params };
}

/** Median in hours (2 decimals) of leg values in ms: each value is first read as the hours JourneyService shows, then the middle two are averaged, as the journey page always did. */
function medianOf(values) {
    if (!values.length) return null;
    const sorted = Float64Array.from(values).sort();
    const middle = Math.floor(sorted.length / 2);
    const hours = (ms) => Number((ms / HOUR_MS).toFixed(2));
    const value = sorted.length % 2 ? hours(sorted[middle]) : (hours(sorted[middle - 1]) + hours(sorted[middle])) / 2;
    return Number(value.toFixed(2));
}

/** A milestone in ms back to the string JourneyService always returned ('YYYY-MM-DD HH:MM:SS', local clock). */
const formatTime = (ms) => (ms === null || ms === undefined ? null : new Date(ms).toISOString().slice(0, 19).replace('T', ' '));

const hoursOf = (ms) => (ms === null || ms === undefined ? null : Number((ms / HOUR_MS).toFixed(2)));

/** The main cause of a route from its cause mix: the same reading as the Phân tích nguyên nhân screen (summarizeRouteMainCause). */
function mainCauseOf(mix, failed) {
    if (!mix || !failed) return null;
    const lines = mix.lines || [];
    const top = [...lines].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
    const phatCount = mix.phat?.count || 0;
    const tronLo = lines.find((line) => line.code === 'KHONG_TRON_LO');
    if (tronLo && tronLo.count > 0 && tronLo.count >= phatCount && tronLo.count >= (top?.count || 0)) {
        return { code: 'KHONG_TRON_LO', label: tronLo.label, count: tronLo.count, share: tronLo.share };
    }
    if (phatCount > 0 && phatCount >= (top?.count || 0)) {
        return { code: 'PHAT', label: 'Phát', count: phatCount, share: mix.phat.share, by_detail: mix.phat.by_detail };
    }
    if (top && top.count > 0) return { code: top.code, label: top.label || labelOfLine(top.code), count: top.count, share: top.share };
    const cho = mix.cho_chuyen_quan?.count || 0;
    if (cho > 0) return { code: 'CHO_CHUYEN_QUAN', label: 'Chờ Chuyên quản phân tích', count: cho, share: mix.cho_chuyen_quan.share, by_reason: mix.cho_chuyen_quan.by_reason };
    return null;
}

/** The stage among tms_arrive / arrive_gbt / gbt_ptc where the failed parcels are slower than the passed ones by the most (gap > 0); else null. */
function slowestLegOf(legsFailed, legsPassed) {
    let best = null;
    let bestGap = 0;
    for (const leg of STAGE_LEGS) {
        const failedValue = legsFailed[leg];
        const passedValue = legsPassed[leg];
        if (failedValue === null || passedValue === null) continue;
        const gap = failedValue - passedValue;
        if (gap > bestGap) { best = leg; bestGap = gap; }
    }
    return best;
}

const splitList = (text) => (text ? String(text).split(',').filter(Boolean) : []);
const routeKeyOf = (scope, maTuyen) => (scope === 'POSTMAN' ? String(maTuyen ?? '') : `@${scope}`);

class JourneyPeriodService {
    /** @param {{db, causeAgg?: CauseAggQueryService}} options db: a sqlite3 Database (or {all}); causeAgg is optional: without it the cause fields stay null */
    constructor({ db, causeAgg = null } = {}) {
        if (!db) throw new Error('JourneyPeriodService needs a db');
        this.db = wrapDb(db);
        this.causeAgg = causeAgg;
    }

    async _causeRows(period, scope) {
        if (!this.causeAgg) return { rows: new Map(), meta: { available: false } };
        try {
            const result = await this.causeAgg.routes({ from: period.from, to: period.to }, { bcvhId: scope.bcvhId ?? null, allowedCodes: scope.allowedCodes ?? null });
            return {
                rows: new Map(result.rows.map((row) => [row.key, row])),
                meta: { available: true, freshness: result.meta?.freshness ?? null },
            };
        } catch (error) {
            return { rows: new Map(), meta: { available: false, error: error.code || error.message } };
        }
    }

    async getRoutes(query, scope = {}) {
        const period = resolveJourneyPeriod(query);
        const where = whereOf(period, scope);
        const causePromise = this._causeRows(period, scope); // started first: it overlaps with the scan below
        const groups = new Map();
        const coverage = { parcels: 0, tms: 0, depart: 0, arrive: 0, gbt: 0, ptc: 0 };
        const lots = { failed: 0, failed_in_lot: 0, khong_tron_lo: 0 };
        const lotCodes = new Set();
        const legCols = LEGS.map((leg) => LEG_COLUMN[leg]).join(', ');
        await this.db.each(
            `SELECT ma_bcvh, route_scope, ma_tuyen, danh_gia, khong_tron_lo, ma_lo, ma_buu_ta_shown, ten_buu_ta_shown, ${legCols}
             FROM f13_cause_parcel WHERE ${where.sql}`,
            where.params,
            (row) => {
                const legs = LEG_COLUMNS.map((column) => row[column]);
                const failed = row.danh_gia === FAILED;
                if (failed) {
                    lots.failed += 1;
                    if (row.ma_lo) lots.failed_in_lot += 1;
                    if (row.khong_tron_lo) { lots.khong_tron_lo += 1; lotCodes.add(row.ma_lo); }
                }
                const routeKey = routeKeyOf(row.route_scope, row.ma_tuyen);
                const key = `${row.ma_bcvh}|${routeKey}`;
                let group = groups.get(key);
                if (!group) {
                    group = {
                        key, ma_bcvh: String(row.ma_bcvh), route_scope: row.route_scope, ma_tuyen: row.route_scope === 'POSTMAN' ? row.ma_tuyen : null,
                        volume: 0, passed: 0, failed: 0, khong_tron_lo: 0, postmen: new Map(),
                        values: Object.fromEntries(LEGS.map((leg) => [leg, { all: [], failed: [], passed: [] }])),
                    };
                    groups.set(key, group);
                }
                group.volume += 1;
                if (row.danh_gia === PASSED) group.passed += 1;
                if (failed) group.failed += 1;
                if (row.khong_tron_lo) group.khong_tron_lo += 1;
                if (row.ma_buu_ta_shown || row.ten_buu_ta_shown) {
                    const postmanKey = row.ma_buu_ta_shown || row.ten_buu_ta_shown;
                    const entry = group.postmen.get(postmanKey) || { ma_buu_ta: row.ma_buu_ta_shown, ten_buu_ta: row.ten_buu_ta_shown, volume: 0 };
                    entry.volume += 1;
                    group.postmen.set(postmanKey, entry);
                }
                const passedRow = row.danh_gia === PASSED;
                for (let index = 0; index < LEGS.length; index += 1) {
                    const value = legs[index];
                    if (value === null || value === undefined) continue;
                    const bucket = group.values[LEGS[index]];
                    bucket.all.push(value);
                    if (failed) bucket.failed.push(value);
                    else if (passedRow) bucket.passed.push(value);
                }
            },
        );

        // coverage of the real milestones and the days built without legs / milestones: one aggregate query, so the scan above stays light
        const perDay = await this.db.all(
            `SELECT ngay_do_kiem AS day, COUNT(*) AS n, SUM(ms_tms IS NOT NULL) AS tms, SUM(ms_depart IS NOT NULL) AS depart, SUM(ms_arrive IS NOT NULL) AS arrive,
                    SUM(ms_gbt IS NOT NULL) AS gbt, SUM(ms_ptc IS NOT NULL) AS ptc,
                    SUM(ms_tms IS NOT NULL OR ms_depart IS NOT NULL OR ms_arrive IS NOT NULL OR ms_gbt IS NOT NULL OR ms_ptc IS NOT NULL) AS with_milestones,
                    SUM(${LEG_COLUMNS.map((column) => `${column} IS NOT NULL`).join(' OR ')}) AS with_legs
             FROM f13_cause_parcel WHERE ${where.sql} GROUP BY ngay_do_kiem`,
            where.params,
        );
        for (const row of perDay) {
            coverage.parcels += Number(row.n);
            for (const key of ['tms', 'depart', 'arrive', 'gbt', 'ptc']) coverage[key] += Number(row[key] || 0);
        }
        const cause = await causePromise;
        const medians = (group, part) => Object.fromEntries(LEGS.map((leg) => [leg, medianOf(group.values[leg][part])]));
        let volumeMismatch = 0;
        const routes = [...groups.values()].map((group) => {
            const metrics = metricsOf({ n: group.volume, passed: group.passed, failed: group.failed, unrated: group.volume - group.passed - group.failed, distinct: group.volume });
            const causeRow = cause.rows.get(group.key) || null;
            if (causeRow && causeRow.volume !== group.volume) volumeMismatch += 1;
            const legsFailed = medians(group, 'failed');
            const legsPassed = medians(group, 'passed');
            const isPostman = group.route_scope === 'POSTMAN';
            return {
                key: group.key,
                ma_bcvh: group.ma_bcvh,
                ten_bcvh: BCVH_NAMES[group.ma_bcvh] ?? null,
                route_scope: group.route_scope,
                ma_tuyen: group.ma_tuyen,
                ten_tuyen: isPostman ? (causeRow?.ten_tuyen ?? null) : (group.route_scope === 'NON_POSTMAN' ? NON_POSTMAN_LABEL : OTHER_LABEL),
                volume: group.volume,
                passed: group.passed,
                failed: group.failed,
                rate: Number(((group.passed / group.volume) * 100).toFixed(1)),
                khong_tron_lo: group.khong_tron_lo,
                own_shortfall: metrics.own_shortfall,
                own_shortfall_x10: metrics.own_shortfall_x10,
                shortfall: metrics.shortfall,
                main_cause: mainCauseOf(causeRow?.cause_mix ?? null, group.failed),
                cause_mix: causeRow?.cause_mix ?? null,
                postmen: [...group.postmen.values()].sort((a, b) => b.volume - a.volume),
                legs: medians(group, 'all'),
                legs_failed: legsFailed,
                legs_passed: legsPassed,
                slowest_leg: slowestLegOf(legsFailed, legsPassed),
                // the parcel list of this row: pass these as the query of /journey/parcels (with the same period)
                filter: { route: isPostman ? group.ma_tuyen : `@${group.route_scope}`, ma_bcvh: group.ma_bcvh },
            };
        }).sort((a, b) => a.ma_bcvh.localeCompare(b.ma_bcvh)
            || SCOPE_ORDER[a.route_scope] - SCOPE_ORDER[b.route_scope]
            || b.own_shortfall_x10 - a.own_shortfall_x10
            || b.volume - a.volume
            || String(a.ma_tuyen).localeCompare(String(b.ma_tuyen)));

        return {
            routes,
            meta: {
                date: period.from === period.to ? period.from : null,
                period,
                has_data: coverage.parcels > 0,
                coverage,
                lots: { ...lots, khong_tron_lo_lots: lotCodes.size },
                legs: {
                    source: 'TABLE',
                    days_without_legs: perDay.filter((row) => !Number(row.with_legs)).map((row) => row.day).sort(),
                    days_without_milestones: perDay.filter((row) => !Number(row.with_milestones)).map((row) => row.day).sort(),
                },
                cause_layer: { ...cause.meta, volume_mismatch_routes: volumeMismatch },
            },
        };
    }

    async _routeNames(period, bcvhCodes) {
        if (!bcvhCodes.length) return new Map();
        try {
            const rows = await this.db.all(
                `SELECT ma_bcvh, ma_tuyen, MAX(ten_tuyen) AS ten_tuyen FROM agg_f13_day
                 WHERE ngay_do_kiem BETWEEN ? AND ? AND ma_bcvh IN (${bcvhCodes.map(() => '?').join(', ')}) GROUP BY ma_bcvh, ma_tuyen`,
                [period.from, period.to, ...bcvhCodes],
            );
            return new Map(rows.map((row) => [`${row.ma_bcvh}|${row.ma_tuyen}`, row.ten_tuyen]));
        } catch {
            return new Map(); // names are a courtesy
        }
    }

    async getParcels(query, { route = null, search = null, onlyKhongTronLo = false, sort = 'tms_ptc', order = 'desc', page = 1, pageSize = DEFAULT_PAGE_SIZE, ...scope } = {}) {
        const period = resolveJourneyPeriod(query);
        const where = whereOf(period, scope);
        const clauses = [where.sql];
        const params = [...where.params];
        if (route) {
            const text = String(route);
            if (text.startsWith('@')) {
                if (!ROUTE_SCOPES.includes(text.slice(1))) throw fail('INVALID_FILTER', 'route không hợp lệ');
                clauses.push('route_scope = ?');
                params.push(text.slice(1));
            } else {
                clauses.push('ma_tuyen = ?'); // plain code: the legacy match on the route code
                params.push(text);
            }
        }
        if (onlyKhongTronLo) clauses.push('khong_tron_lo = 1');
        const needle = search ? String(search).trim().toUpperCase() : '';
        if (needle) {
            clauses.push("(UPPER(ma_bg) LIKE ? ESCAPE '\\' OR UPPER(COALESCE(ma_lo, '')) LIKE ? ESCAPE '\\')");
            const like = `%${needle.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
            params.push(like, like);
        }
        const whereSql = clauses.join(' AND ');
        const total = Number((await this.db.all(`SELECT COUNT(*) AS n FROM f13_cause_parcel WHERE ${whereSql}`, params))[0].n);
        const size = Math.min(Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(total / size));
        const current = Math.min(Math.max(Number(page) || 1, 1), totalPages);
        const column = PARCEL_SORT_COLUMN[sort] || LEG_COLUMN.tms_ptc;
        const direction = order === 'asc' ? 'ASC' : 'DESC';
        // missing values last in both directions, then a stable order
        const rows = await this.db.all(
            `SELECT ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown, danh_gia,
                    cause_code, cause_detail, cause_reason, cause_status, cause_step, flags, hints, ma_lo, khong_tron_lo, limit_ms, tct_ms, l_ms, r_ms,
                    remaining_at_arrival_ms, a_source, basis, ${MILESTONE_COLUMNS.join(', ')}, ms_arrive_source, ${LEG_COLUMN.tms_depart}, ${LEG_COLUMN.depart_arrive}, ${LEG_COLUMN.tms_arrive},
                    ${LEG_COLUMN.arrive_gbt}, ${LEG_COLUMN.gbt_ptc}, ${LEG_COLUMN.tms_ptc}
             FROM f13_cause_parcel WHERE ${whereSql}
             ORDER BY ${column} IS NULL, ${column} ${direction}, ngay_do_kiem ASC, ma_bg ASC LIMIT ? OFFSET ?`,
            [...params, size, (current - 1) * size],
        );
        const names = await this._routeNames(period, [...new Set(rows.map((row) => String(row.ma_bcvh)))]);
        const parcels = rows.map((row) => {
            const legs = Object.fromEntries(LEGS.map((leg) => [leg, hoursOf(row[LEG_COLUMN[leg]])]));
            const isPostman = row.route_scope === 'POSTMAN';
            return {
                ngay_do_kiem: row.ngay_do_kiem,
                ma_bg: row.ma_bg,
                ma_bcvh: row.ma_bcvh,
                ten_bcvh: BCVH_NAMES[row.ma_bcvh] ?? null,
                ma_tuyen: row.ma_tuyen,
                ten_tuyen: isPostman ? (names.get(`${row.ma_bcvh}|${row.ma_tuyen}`) ?? null) : (row.route_scope === 'NON_POSTMAN' ? NON_POSTMAN_LABEL : OTHER_LABEL),
                route_scope: row.route_scope,
                danh_gia: row.danh_gia,
                ma_buu_ta: row.ma_buu_ta_shown,
                ten_buu_ta: row.ten_buu_ta_shown,
                ma_buu_ta_first: row.ma_buu_ta_first,
                ten_buu_ta_first: row.ten_buu_ta_first,
                cause: row.cause_code
                    ? { code: row.cause_code, label: CAUSES[row.cause_code]?.label ?? labelOfLine(row.cause_code), detail: row.cause_detail ?? null, detail_label: PHAT_DETAILS[row.cause_detail]?.label ?? null, line: lineOf(row.cause_code, row.cause_detail) }
                    : null,
                cause_status: row.cause_status,
                cause_step: row.cause_step,
                cause_reason: row.cause_reason ?? null,
                cause_basis: row.basis ?? null,
                a_source: row.a_source ?? null,
                remaining_at_arrival_ms: row.remaining_at_arrival_ms ?? null,
                flags: splitList(row.flags),
                hints: splitList(row.hints),
                ma_lo: row.ma_lo,
                khong_tron_lo: Boolean(row.khong_tron_lo),
                limit_ms: row.limit_ms,
                tct_ms: row.tct_ms,
                l_ms: row.l_ms,
                r_ms: row.r_ms,
                legs,
                milestones: {
                    tms: formatTime(row.ms_tms), depart: formatTime(row.ms_depart), arrive: formatTime(row.ms_arrive), arrive_source: row.ms_arrive_source ?? null,
                    gbt: formatTime(row.ms_gbt), gbt_first: formatTime(row.ms_gbt_first), ptc: formatTime(row.ms_ptc),
                },
            };
        });
        return {
            parcels,
            meta: { date: period.from === period.to ? period.from : null, period, total, page: current, page_size: size, total_pages: totalPages },
        };
    }
}

module.exports = { JourneyPeriodService, resolveJourneyPeriod, mainCauseOf, slowestLegOf, routeKeyOf, shiftIsoDate, MAX_DAYS, LEGS, STAGE_LEGS };

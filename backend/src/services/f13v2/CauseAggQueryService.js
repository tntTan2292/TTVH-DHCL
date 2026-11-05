'use strict';

// F13-WHY-AGG-01 Phase 2: the query layer over the derived table `f13_cause_parcel` (Design of Record sections 6, 6A, 9, 10).
// Everything here is a GROUP BY over the table: counts are integers, the shortfall is kept in tenths of a parcel
// (shortfall_x10 = 9 N - 10 Dat) and nothing is rounded before a sum; the rate is computed from the integers for display only.
// The unit of count is the BG-day row (the official F1.3 basis); distinct parcels (`distinct_bg`) are information only and are never
// summed across children. A figure and the list of parcels behind it are built from the same WHERE clause.
//
// Freshness (P2): reports the STORED state of each day (FRESH / STALE / BUILDING / missing). The signature check is P3.

const { CANONICAL_BCVH_UNITS } = require('../../config/canonicalBcvhUnits');
const { weekBoundsForWeekId } = require('../bcvhWeeklyComparisonService');
const { monthBounds, isRealDate } = require('./periodResolve');
const { CAUSES } = require('./CauseClassifier');

const FAILED = 'Không đạt';
const PASSED = 'Đạt';
const TARGET_X10 = 9; // 90 % written as 9 / 10: shortfall_x10 = 9 N - 10 Dat
const MAX_RANGE_DAYS = 366;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const ROUTE_SCOPES = ['POSTMAN', 'NON_POSTMAN', 'OTHER'];
const CAUSE_ORDER = ['KHONG_TRON_LO', 'KHAI_THAC', 'VAN_CHUYEN', 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', 'GIAO_BUU_TA_QUA_GIO', 'PHAT_MUON'];
const NO_POSTMAN = 'NONE';
const BCVH_NAMES = Object.fromEntries(CANONICAL_BCVH_UNITS.map((unit) => [unit.ma_bcvh, unit.ten_bcvh]));

const LEVELS = {
    summary: { keys: [], select: '', groupBy: '', nameSql: '' },
    bcvh: { keys: ['ma_bcvh'], select: 'ma_bcvh', groupBy: 'ma_bcvh', nameSql: '' },
    routes: {
        keys: ['ma_bcvh', 'route_scope', 'route_key'],
        select: "ma_bcvh, route_scope, CASE WHEN route_scope = 'POSTMAN' THEN ma_tuyen ELSE '@' || route_scope END AS route_key",
        groupBy: 'ma_bcvh, route_scope, route_key',
        nameSql: '',
    },
    postmen: {
        keys: ['ma_bcvh', 'postman_key'],
        select: "ma_bcvh, COALESCE(ma_buu_ta_first, 'NONE') AS postman_key",
        groupBy: 'ma_bcvh, postman_key',
        nameSql: ', MAX(ten_buu_ta_first) AS postman_name',
    },
};

const PARCEL_SORTS = new Set(['ngay_do_kiem', 'ma_bg', 'ma_bcvh', 'ma_tuyen', 'ma_buu_ta_first', 'danh_gia', 'cause_code', 'ma_lo']);
const GROUP_SORTS = new Set(['own_shortfall', 'net_contribution', 'volume', 'rate', 'failed', 'unrated', 'key']);

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

const toNumber = (value) => Number(value || 0);
const splitList = (text) => (text ? String(text).split(',').filter(Boolean) : []);
const ratio = (part, whole) => (whole > 0 ? part / whole : null);
const percentOne = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null); // display rounding only

/** The day range of a request: exactly one of `from`+`to`, `week` (Thursday-Wednesday id), `month` (YYYY-MM). */
function resolvePeriod(query = {}) {
    const hasRange = query.from !== undefined || query.to !== undefined;
    const selectors = [hasRange, query.week !== undefined, query.month !== undefined].filter(Boolean).length;
    if (selectors === 0) throw fail('MISSING_PARAM', 'Yêu cầu from và to, hoặc week, hoặc month');
    if (selectors > 1) throw fail('MISSING_PARAM', 'Chỉ dùng một trong from+to, week, month');
    let period;
    if (query.week !== undefined) {
        const bounds = weekBoundsForWeekId(String(query.week)); // throws INVALID_WEEK_ID
        period = { kind: 'week', from: bounds.weekStart, to: bounds.weekEnd, week_id: String(query.week) };
    } else if (query.month !== undefined) {
        const bounds = monthBounds(String(query.month)); // throws INVALID_MONTH_ID
        period = { kind: 'month', from: bounds.month_start, to: bounds.month_end, month_id: String(query.month) };
    } else {
        if (!query.from || !query.to) throw fail('MISSING_PARAM', 'Yêu cầu from và to');
        const from = String(query.from);
        const to = String(query.to);
        if (!isRealDate(from) || !isRealDate(to)) throw fail('INVALID_DATE', 'from và to phải là ngày YYYY-MM-DD hợp lệ');
        if (from > to) throw fail('INVALID_RANGE', 'from không được sau to');
        period = { kind: 'range', from, to };
    }
    const days = Math.round((Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86400000) + 1;
    if (days > MAX_RANGE_DAYS) throw fail('RANGE_TOO_LONG', `Khoảng ngày tối đa ${MAX_RANGE_DAYS} ngày`);
    return { ...period, days };
}

function wrapDb(db) {
    if (typeof db.serialize === 'function') { // a sqlite3 Database (callback style)
        return { all: (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)))) };
    }
    return db;
}

/** Metrics of a group from its integer counters. Nothing is rounded except the display rate. */
function metricsOf(counts) {
    const n = toNumber(counts.n);
    const passed = toNumber(counts.passed);
    const failed = toNumber(counts.failed);
    const unrated = toNumber(counts.unrated);
    const distinct = toNumber(counts.distinct);
    const shortfallX10 = TARGET_X10 * n - 10 * passed;
    return {
        volume: n,
        passed,
        failed,
        unrated,
        distinct_bg: distinct,
        repeat: n - distinct,
        rate: percentOne(passed, n),
        shortfall_x10: shortfallX10,
        shortfall: shortfallX10 / 10,
        own_shortfall_x10: Math.max(0, shortfallX10),
        own_shortfall: Math.max(0, shortfallX10) / 10,
        net_contribution_x10: shortfallX10,
        net_contribution: shortfallX10 / 10,
    };
}

function emptyMix() {
    return { counts: {}, chua_du: { count: 0, by_step: {}, by_flag: {} }, unclassified: 0, hints: {} };
}

function addCauseRow(mix, row) {
    const count = toNumber(row.c);
    if (row.cause_status === 'CAUSE' && row.cause_code) mix.counts[row.cause_code] = (mix.counts[row.cause_code] || 0) + count;
    else if (row.cause_status === 'CHUA_DU_CAN_CU') {
        mix.chua_du.count += count;
        const step = row.cause_step || '-';
        mix.chua_du.by_step[step] = (mix.chua_du.by_step[step] || 0) + count;
        for (const flag of splitList(row.flags)) mix.chua_du.by_flag[flag] = (mix.chua_du.by_flag[flag] || 0) + count;
    } else mix.unclassified += count;
}

/** Cause lines over the failed parcels: every cause, "chưa đủ căn cứ" as its own line; the lines add up to the failed count. */
function causeMixOf(mix, failed) {
    return {
        failed,
        lines: CAUSE_ORDER.map((code) => ({ code, label: CAUSES[code].label, count: mix.counts[code] || 0, share: ratio(mix.counts[code] || 0, failed) })),
        chua_du_can_cu: { count: mix.chua_du.count, share: ratio(mix.chua_du.count, failed), by_step: mix.chua_du.by_step, by_flag: mix.chua_du.by_flag },
        unclassified: mix.unclassified,
    };
}

class CauseAggQueryService {
    /** @param {{db: sqlite3.Database|{all: Function}}} options db must offer all(sql, params) (callback or promise style) */
    constructor({ db } = {}) {
        if (!db) throw new Error('CauseAggQueryService needs a db');
        this.db = wrapDb(db);
    }

    // ---- filter -> WHERE, shared by the figures and the parcel list
    _where(period, scope, filter, { forParcels = false } = {}) {
        const clauses = ['ngay_do_kiem BETWEEN ? AND ?'];
        const params = [period.from, period.to];
        // the controller turns the `bcvh` query value into scope.bcvhId (narrowing only); called directly, the value in the filter counts too
        const asked = filter.bcvh !== undefined && filter.bcvh !== null && String(filter.bcvh) !== '' && String(filter.bcvh) !== 'all' ? String(filter.bcvh) : null;
        const bcvhId = scope.bcvhId || asked;
        const allowed = Array.isArray(scope.allowedCodes) ? scope.allowedCodes.map(String) : null;
        if (bcvhId) {
            if (allowed && !allowed.includes(String(bcvhId))) throw fail('OUT_OF_SCOPE', 'Đơn vị nằm ngoài phạm vi được phép xem');
            clauses.push('ma_bcvh = ?');
            params.push(String(bcvhId));
        } else if (allowed) {
            if (allowed.length === 0) clauses.push('0 = 1');
            else {
                clauses.push(`ma_bcvh IN (${allowed.map(() => '?').join(', ')})`);
                params.push(...allowed);
            }
        }
        if (filter.route_scope !== undefined && filter.route_scope !== null && filter.route_scope !== '') {
            if (!ROUTE_SCOPES.includes(String(filter.route_scope))) throw fail('INVALID_FILTER', 'route_scope phải là POSTMAN, NON_POSTMAN hoặc OTHER');
            clauses.push('route_scope = ?');
            params.push(String(filter.route_scope));
        }
        if (filter.route !== undefined && filter.route !== null && filter.route !== '') {
            const route = String(filter.route);
            if (route.startsWith('@')) {
                if (!ROUTE_SCOPES.includes(route.slice(1))) throw fail('INVALID_FILTER', 'route không hợp lệ');
                clauses.push('route_scope = ?');
                params.push(route.slice(1));
            } else {
                clauses.push("route_scope = 'POSTMAN' AND ma_tuyen = ?");
                params.push(route);
            }
        }
        if (filter.postman !== undefined && filter.postman !== null && filter.postman !== '') {
            if (String(filter.postman) === NO_POSTMAN) clauses.push('ma_buu_ta_first IS NULL');
            else {
                clauses.push('ma_buu_ta_first = ?');
                params.push(String(filter.postman));
            }
        }
        if (forParcels) {
            if (filter.verdict) {
                const verdict = String(filter.verdict);
                if (verdict === PASSED || verdict === FAILED) {
                    clauses.push('danh_gia = ?');
                    params.push(verdict);
                } else if (verdict === 'CHUA_DANH_GIA') clauses.push("(danh_gia IS NULL OR TRIM(danh_gia) = '')");
                else throw fail('INVALID_FILTER', 'verdict phải là Đạt, Không đạt hoặc CHUA_DANH_GIA');
            }
            if (filter.cause) {
                const cause = String(filter.cause);
                if (CAUSE_ORDER.includes(cause)) {
                    clauses.push("cause_status = 'CAUSE' AND cause_code = ?");
                    params.push(cause);
                } else if (cause === 'CHUA_DU_CAN_CU' || cause === 'KHONG_PHAN_TICH') {
                    clauses.push('cause_status = ?');
                    params.push(cause);
                } else throw fail('INVALID_FILTER', 'cause không hợp lệ');
            }
            if (filter.hint) {
                clauses.push("(',' || COALESCE(hints, '') || ',') LIKE ?");
                params.push(`%,${String(filter.hint)},%`);
            }
        }
        return { sql: clauses.join(' AND '), params };
    }

    /** The query parameters that open the parcels of one group. */
    _filterEcho(period, scope, filter, keys) {
        const echo = { from: period.from, to: period.to };
        if (scope.bcvhId) echo.bcvh = String(scope.bcvhId);
        if (filter.route) echo.route = String(filter.route);
        if (filter.route_scope) echo.route_scope = String(filter.route_scope);
        if (filter.postman) echo.postman = String(filter.postman);
        return { ...echo, ...keys };
    }

    // ---- freshness: the stored state of every day with data in the range
    async freshness(period) {
        const factDays = (await this.db.all('SELECT DISTINCT ngay_do_kiem AS d FROM fact_f13 WHERE ngay_do_kiem BETWEEN ? AND ? ORDER BY 1', [period.from, period.to])).map((row) => row.d);
        const dayRows = await this.db.all('SELECT ngay_do_kiem AS d, state, built_at, error FROM f13_cause_day WHERE ngay_do_kiem BETWEEN ? AND ? ORDER BY 1', [period.from, period.to]);
        const byDay = new Map(dayRows.map((row) => [row.d, row]));
        const staleDays = dayRows.filter((row) => row.state === 'STALE').map((row) => row.d);
        const buildingDays = dayRows.filter((row) => row.state === 'BUILDING').map((row) => row.d);
        const missingDays = factDays.filter((day) => !byDay.has(day));
        const builtTo = await this.db.all("SELECT MAX(ngay_do_kiem) AS d FROM f13_cause_day WHERE state = 'FRESH'");
        return {
            complete: staleDays.length === 0 && buildingDays.length === 0 && missingDays.length === 0,
            stale_days: staleDays,
            building_days: buildingDays,
            missing_days: missingDays,
            built_to: builtTo[0]?.d ?? null,
            days_with_data: factDays.length,
            check: 'STORED_STATE', // the signature check against the current sources is P3
        };
    }

    async _repeats(period, scope, filter) {
        const where = this._where(period, scope, filter);
        const row = (await this.db.all(`SELECT COUNT(*) AS n, COUNT(DISTINCT ma_bg) AS d FROM f13_cause_parcel WHERE ${where.sql}`, where.params))[0];
        const rows = toNumber(row.n);
        const distinct = toNumber(row.d);
        return { rows, distinct, extra: rows - distinct };
    }

    async _meta(period, scope, filter) {
        return {
            period,
            scope: { bcvh: scope.bcvhId ? String(scope.bcvhId) : null },
            basis: 'BG_DAY_ROWS',
            repeats: await this._repeats(period, scope, filter),
            freshness: await this.freshness(period),
        };
    }

    /** All groups of one level with their counters, cause mix and hints. Returns Map key -> { keys, counts, mix, name }. */
    async _groups(level, period, scope, filter) {
        const spec = LEVELS[level];
        const where = this._where(period, scope, filter);
        const select = spec.select ? `${spec.select}, ` : '';
        const groupBy = spec.groupBy ? `GROUP BY ${spec.groupBy}` : '';
        const counters = await this.db.all(
            `SELECT ${select}COUNT(*) AS n,
                    SUM(CASE WHEN danh_gia = '${PASSED}' THEN 1 ELSE 0 END) AS passed,
                    SUM(CASE WHEN danh_gia = '${FAILED}' THEN 1 ELSE 0 END) AS failed,
                    SUM(CASE WHEN danh_gia IS NULL OR TRIM(danh_gia) = '' THEN 1 ELSE 0 END) AS unrated,
                    COUNT(DISTINCT ma_bg) AS distinct_bg${spec.nameSql}
             FROM f13_cause_parcel WHERE ${where.sql} ${groupBy}`,
            where.params,
        );
        const causeRows = await this.db.all(
            `SELECT ${select}cause_status, cause_code, cause_step, flags, COUNT(*) AS c
             FROM f13_cause_parcel WHERE ${where.sql} AND danh_gia = '${FAILED}'
             GROUP BY ${spec.groupBy ? `${spec.groupBy}, ` : ''}cause_status, cause_code, cause_step, flags`,
            where.params,
        );
        const hintRows = await this.db.all(
            `SELECT ${select}hints, COUNT(*) AS c FROM f13_cause_parcel WHERE ${where.sql} AND hints IS NOT NULL AND hints <> ''
             GROUP BY ${spec.groupBy ? `${spec.groupBy}, ` : ''}hints`,
            where.params,
        );
        const keyOf = (row) => spec.keys.map((key) => row[key]).join('|');
        const groups = new Map();
        for (const row of counters) {
            const keys = Object.fromEntries(spec.keys.map((key) => [key, row[key]]));
            groups.set(keyOf(row), {
                keys,
                name: row.postman_name ?? null,
                counts: { n: row.n, passed: row.passed, failed: row.failed, unrated: row.unrated, distinct: row.distinct_bg },
                mix: emptyMix(),
            });
        }
        for (const row of causeRows) addCauseRow(groups.get(keyOf(row)).mix, row);
        for (const row of hintRows) {
            const mix = groups.get(keyOf(row)).mix;
            for (const hint of splitList(row.hints)) mix.hints[hint] = (mix.hints[hint] || 0) + toNumber(row.c);
        }
        return groups;
    }

    _finish(group) {
        const metrics = metricsOf(group.counts);
        return { ...metrics, cause_mix: causeMixOf(group.mix, metrics.failed), hints: group.mix.hints };
    }

    /** Shares inside a set of sibling rows (the parent group): shortfall share only when the parent is below target. */
    _addShares(rows) {
        const sum = (field) => rows.reduce((total, row) => total + row[field], 0);
        const parentShortfallX10 = sum('shortfall_x10');
        const deficitsX10 = sum('own_shortfall_x10');
        const failed = sum('failed');
        for (const row of rows) {
            row.share_of_parent_shortfall = parentShortfallX10 > 0 ? row.shortfall_x10 / parentShortfallX10 : null;
            row.share_of_parent_deficits = deficitsX10 > 0 ? row.own_shortfall_x10 / deficitsX10 : null;
            row.share_of_parent_failed = failed > 0 ? row.failed / failed : null;
            row.share_note = parentShortfallX10 > 0 ? null : 'KHONG_AP_DUNG'; // the parent is on target: no shortfall to share
        }
    }

    _sortRows(rows, query) {
        const sort = GROUP_SORTS.has(query.sort) ? query.sort : 'own_shortfall';
        const direction = String(query.order || '').toLowerCase() === 'asc' ? 1 : -1;
        const valueOf = (row) => ({
            own_shortfall: row.own_shortfall_x10, net_contribution: row.net_contribution_x10, volume: row.volume, rate: row.rate ?? -1, failed: row.failed, unrated: row.unrated, key: row.key,
        }[sort]);
        return rows.sort((a, b) => {
            const x = valueOf(a);
            const y = valueOf(b);
            const compared = typeof x === 'string' ? x.localeCompare(y, 'vi') : x - y;
            return compared * direction || b.volume - a.volume || String(a.key).localeCompare(String(b.key));
        });
    }

    // ---- public queries
    async summary(query, scope) {
        const period = resolvePeriod(query);
        const groups = await this._groups('summary', period, scope, query);
        const group = groups.get('') || { counts: {}, mix: emptyMix() };
        return { totals: { ...this._finish(group), filter: this._filterEcho(period, scope, query, {}) }, meta: await this._meta(period, scope, query) };
    }

    async bcvh(query, scope) {
        const period = resolvePeriod(query);
        const groups = await this._groups('bcvh', period, scope, query);
        const rows = [...groups.values()].map((group) => ({
            key: String(group.keys.ma_bcvh),
            ma_bcvh: String(group.keys.ma_bcvh),
            ten_bcvh: BCVH_NAMES[group.keys.ma_bcvh] || null,
            ...this._finish(group),
            filter: this._filterEcho(period, { ...scope, bcvhId: String(group.keys.ma_bcvh) }, query, {}),
        }));
        const data = { rows: [], meta: await this._meta(period, scope, query) };
        if (scope.canSeeCity) {
            this._addShares(rows);
            const whole = (await this._groups('summary', period, scope, query)).get('') || { counts: {}, mix: emptyMix() };
            data.total = { ...this._finish(whole), filter: this._filterEcho(period, scope, query, {}) };
        } else {
            for (const row of rows) { row.share_of_parent_shortfall = null; row.share_of_parent_deficits = null; row.share_of_parent_failed = null; row.share_note = 'NGOAI_PHAM_VI'; }
        }
        data.rows = this._sortRows(rows, query);
        return data;
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
            return new Map(); // names are a courtesy: the figures do not depend on them
        }
    }

    async routes(query, scope) {
        const period = resolvePeriod(query);
        const groups = await this._groups('routes', period, scope, query);
        const names = await this._routeNames(period, [...new Set([...groups.values()].map((group) => String(group.keys.ma_bcvh)))]);
        const rows = [...groups.values()].map((group) => {
            const { ma_bcvh: bcvh, route_scope: routeScope, route_key: routeKey } = group.keys;
            const isRoute = routeScope === 'POSTMAN';
            return {
                key: `${bcvh}|${routeKey}`,
                ma_bcvh: String(bcvh),
                route_scope: routeScope,
                ma_tuyen: isRoute ? routeKey : null,
                ten_tuyen: isRoute ? (names.get(`${bcvh}|${routeKey}`) ?? null) : (routeScope === 'NON_POSTMAN' ? 'Tuyến không giao bưu tá' : 'Tuyến khác / không xác định'),
                ...this._finish(group),
                filter: this._filterEcho(period, { ...scope, bcvhId: String(bcvh) }, { ...query, route: undefined, route_scope: undefined }, isRoute ? { route: routeKey } : { route_scope: routeScope }),
            };
        });
        return this._siblingResult(rows, period, scope, query);
    }

    async postmen(query, scope) {
        const period = resolvePeriod(query);
        const groups = await this._groups('postmen', period, scope, query);
        const rows = [...groups.values()].map((group) => {
            const { ma_bcvh: bcvh, postman_key: postman } = group.keys;
            return {
                key: `${bcvh}|${postman}`,
                ma_bcvh: String(bcvh),
                ma_buu_ta: postman === NO_POSTMAN ? null : postman,
                ten_buu_ta: postman === NO_POSTMAN ? 'Chưa có bưu tá' : (group.name ?? null),
                ...this._finish(group),
                filter: this._filterEcho(period, { ...scope, bcvhId: String(bcvh) }, { ...query, postman: undefined }, { postman }),
            };
        });
        return this._siblingResult(rows, period, scope, query);
    }

    /** Rows of one level plus, per BCVH, the parent totals (their own sums) and the shares inside that parent. */
    async _siblingResult(rows, period, scope, query) {
        const byBcvh = new Map();
        for (const row of rows) (byBcvh.get(row.ma_bcvh) || byBcvh.set(row.ma_bcvh, []).get(row.ma_bcvh)).push(row);
        const parentGroups = await this._groups('bcvh', period, scope, query); // same filter: the parent of each BCVH's rows
        const parents = {};
        for (const [bcvh, siblings] of byBcvh) {
            this._addShares(siblings);
            parents[bcvh] = this._finish(parentGroups.get(bcvh));
        }
        return { rows: this._sortRows(rows, query), parents, meta: await this._meta(period, scope, query) };
    }

    async parcels(query, scope) {
        const period = resolvePeriod(query);
        const where = this._where(period, scope, query, { forParcels: true });
        const size = Math.min(Math.max(Number(query.page_size ?? query.pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
        const total = toNumber((await this.db.all(`SELECT COUNT(*) AS n FROM f13_cause_parcel WHERE ${where.sql}`, where.params))[0].n);
        const totalPages = Math.max(1, Math.ceil(total / size));
        const page = Math.min(Math.max(Number(query.page) || 1, 1), totalPages);
        const sort = PARCEL_SORTS.has(query.sort) ? query.sort : 'ngay_do_kiem';
        const direction = String(query.order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const rows = await this.db.all(
            `SELECT ngay_do_kiem, ma_bg, ma_bcvh, ma_tuyen, route_scope, ma_buu_ta_first, ten_buu_ta_first, ma_buu_ta_shown, ten_buu_ta_shown,
                    danh_gia, cause_code, cause_status, cause_step, flags, hints, ma_lo, khong_tron_lo, limit_ms, tct_ms, l_ms, r_ms
             FROM f13_cause_parcel WHERE ${where.sql}
             ORDER BY ${sort} ${direction}, ngay_do_kiem DESC, ma_bg ASC LIMIT ? OFFSET ?`,
            [...where.params, size, (page - 1) * size],
        );
        return {
            parcels: rows.map((row) => ({
                ngay_do_kiem: row.ngay_do_kiem,
                ma_bg: row.ma_bg,
                ma_bcvh: row.ma_bcvh,
                ma_tuyen: row.ma_tuyen,
                route_scope: row.route_scope,
                ma_buu_ta_first: row.ma_buu_ta_first,
                ten_buu_ta_first: row.ten_buu_ta_first,
                ma_buu_ta_shown: row.ma_buu_ta_shown,
                ten_buu_ta_shown: row.ten_buu_ta_shown,
                danh_gia: row.danh_gia,
                cause: row.cause_code ? { code: row.cause_code, label: CAUSES[row.cause_code]?.label ?? null } : null,
                cause_status: row.cause_status,
                cause_step: row.cause_step,
                flags: splitList(row.flags),
                hints: splitList(row.hints),
                ma_lo: row.ma_lo,
                khong_tron_lo: Boolean(row.khong_tron_lo),
                limit_ms: row.limit_ms,
                tct_ms: row.tct_ms,
                l_ms: row.l_ms,
                r_ms: row.r_ms,
            })),
            meta: { ...(await this._meta(period, scope, query)), total, page, page_size: size, total_pages: totalPages },
        };
    }
}

module.exports = { CauseAggQueryService, resolvePeriod, metricsOf, causeMixOf, CAUSE_ORDER, ROUTE_SCOPES, NO_POSTMAN, MAX_RANGE_DAYS };

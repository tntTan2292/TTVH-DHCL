'use strict';

// F13-ROUTE-CAPACITY-01 B1: route capacity and daily load over the derived table `f13_cause_parcel` (read only; its counts equal fact_f13).
// The rules are in RouteCapacity.js (pure); this file only reads the daily volume of each route and applies them.

const { CANONICAL_BCVH_UNITS } = require('../../config/canonicalBcvhUnits');
const { resolvePeriod } = require('./CauseAggQueryService');
const {
    CAPACITY_CONFIG, STATES, routeDays, dayWithoutCapacity, summarizeDays, capacityOn,
} = require('./RouteCapacity');

const BCVH_NAMES = Object.fromEntries(CANONICAL_BCVH_UNITS.map((unit) => [unit.ma_bcvh, unit.ten_bcvh]));
const PASSED = 'Đạt';
const NON_POSTMAN_LABELS = { NON_POSTMAN: 'Phát tại quầy', OTHER: 'Tuyến chưa xác định' };

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function wrapDb(db) {
    if (typeof db.serialize === 'function') {
        return { all: (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)))) };
    }
    return db;
}

const round = (value, digits) => (value === null || value === undefined ? null : Math.round(value * 10 ** digits) / 10 ** digits);
const shiftDate = (isoDate, days) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const routeKeyOf = (bcvh, tuyen) => `${bcvh}|${tuyen}`;

class RouteCapacityService {
    /** @param {{db: object, config?: object}} options db must offer all(sql, params) (callback or promise style) */
    constructor({ db, config = CAPACITY_CONFIG } = {}) {
        if (!db) throw new Error('RouteCapacityService needs a db');
        this.db = wrapDb(db);
        this.config = config;
    }

    /** SQL clause and params of the scope: a BCVH filter narrows, never widens, what the account may see. */
    _scopeClause(scope = {}, filter = {}) {
        const asked = filter.bcvh !== undefined && filter.bcvh !== null && String(filter.bcvh) !== '' && String(filter.bcvh) !== 'all' ? String(filter.bcvh) : null;
        const bcvhId = scope.bcvhId || asked;
        const allowed = Array.isArray(scope.allowedCodes) ? scope.allowedCodes.map(String) : null;
        if (bcvhId) {
            if (allowed && !allowed.includes(String(bcvhId))) throw fail('OUT_OF_SCOPE', 'Đơn vị nằm ngoài phạm vi được phép xem');
            return { sql: ' AND ma_bcvh = ?', params: [String(bcvhId)] };
        }
        if (allowed) {
            if (allowed.length === 0) return { sql: ' AND 0 = 1', params: [] };
            return { sql: ` AND ma_bcvh IN (${allowed.map(() => '?').join(', ')})`, params: allowed };
        }
        return { sql: '', params: [] };
    }

    /** Daily volume of the POSTMAN routes from `historyFrom` to `to`: one row per route-day with volume. */
    async _postmanDays(historyFrom, to, scopeClause, extra = { sql: '', params: [] }) {
        return this.db.all(
            `SELECT ngay_do_kiem AS date, ma_bcvh, ma_tuyen, COUNT(*) AS volume,
                    SUM(CASE WHEN danh_gia = ? THEN 1 ELSE 0 END) AS passed,
                    COUNT(DISTINCT ma_buu_ta_first) AS postmen
             FROM f13_cause_parcel
             WHERE ngay_do_kiem BETWEEN ? AND ? AND route_scope = 'POSTMAN'${scopeClause.sql}${extra.sql}
             GROUP BY ngay_do_kiem, ma_bcvh, ma_tuyen`,
            [PASSED, historyFrom, to, ...scopeClause.params, ...extra.params],
        );
    }

    async _routeNames(from, to, scopeClause) {
        try {
            const rows = await this.db.all(
                `SELECT ma_bcvh, ma_tuyen, MAX(ten_tuyen) AS ten_tuyen FROM fact_f13
                 WHERE ngay_do_kiem BETWEEN ? AND ?${scopeClause.sql} GROUP BY ma_bcvh, ma_tuyen`,
                [from, to, ...scopeClause.params],
            );
            return new Map(rows.map((row) => [routeKeyOf(row.ma_bcvh, row.ma_tuyen), row.ten_tuyen]));
        } catch {
            return new Map(); // a database without fact_f13: names stay empty
        }
    }

    _group(rows) {
        const groups = new Map();
        for (const row of rows) {
            const key = routeKeyOf(row.ma_bcvh, row.ma_tuyen);
            if (!groups.has(key)) groups.set(key, { ma_bcvh: row.ma_bcvh, ma_tuyen: row.ma_tuyen, history: [] });
            groups.get(key).history.push({ date: row.date, volume: Number(row.volume), passed: Number(row.passed), postmen: Number(row.postmen) });
        }
        return groups;
    }

    /** GET /capacity/routes: one row per route that has volume in the period. */
    async routes(query = {}, scope = {}) {
        const period = resolvePeriod(query);
        const scopeClause = this._scopeClause(scope, query);
        const historyFrom = shiftDate(period.from, -this.config.CAPACITY_WINDOW_DAYS);
        const [postmanRows, otherRows, names] = await Promise.all([
            this._postmanDays(historyFrom, period.to, scopeClause),
            this.db.all(
                `SELECT ngay_do_kiem AS date, ma_bcvh, route_scope AS ma_tuyen, COUNT(*) AS volume,
                        SUM(CASE WHEN danh_gia = ? THEN 1 ELSE 0 END) AS passed, COUNT(DISTINCT ma_buu_ta_first) AS postmen
                 FROM f13_cause_parcel
                 WHERE ngay_do_kiem BETWEEN ? AND ? AND route_scope <> 'POSTMAN'${scopeClause.sql}
                 GROUP BY ngay_do_kiem, ma_bcvh, route_scope`,
                [PASSED, period.from, period.to, ...scopeClause.params],
            ),
            this._routeNames(period.from, period.to, scopeClause),
        ]);

        const rows = [];
        const perBcvh = new Map(); // C5: reference only, from the route-days of the period
        for (const group of this._group(postmanRows).values()) {
            const days = routeDays(group.history, period.from, period.to, this.config);
            if (!days.length) continue;
            const summary = summarizeDays(days);
            const stat = perBcvh.get(group.ma_bcvh) || { volume: 0, routeDays: 0 };
            stat.volume += summary.volume;
            stat.routeDays += summary.days;
            perBcvh.set(group.ma_bcvh, stat);
            const { capacity } = capacityOn(group.history, period.to, this.config);
            rows.push(this._row(group, 'POSTMAN', names.get(routeKeyOf(group.ma_bcvh, group.ma_tuyen)) ?? null, capacity, summary));
        }
        for (const group of this._group(otherRows).values()) {
            const days = group.history.sort((a, b) => (a.date < b.date ? -1 : 1)).map(dayWithoutCapacity);
            rows.push(this._row({ ma_bcvh: group.ma_bcvh, ma_tuyen: `@${group.ma_tuyen}` }, group.ma_tuyen, NON_POSTMAN_LABELS[group.ma_tuyen] || group.ma_tuyen, null, summarizeDays(days)));
        }
        for (const row of rows) {
            const stat = perBcvh.get(row.ma_bcvh);
            row.bcvh_avg_per_route = stat && stat.routeDays ? round(stat.volume / stat.routeDays, 1) : null;
        }
        rows.sort((a, b) => (a.ma_bcvh === b.ma_bcvh ? (b.volume_avg ?? 0) - (a.volume_avg ?? 0) : String(a.ma_bcvh).localeCompare(String(b.ma_bcvh))));
        return {
            rows,
            meta: {
                period: { kind: period.kind, from: period.from, to: period.to, days: period.days },
                scope: { bcvh: scope.bcvhId ? String(scope.bcvhId) : null },
                config: { ...this.config },
                capacity_at: period.to,
            },
        };
    }

    _row(group, routeScope, tenTuyen, capacity, summary) {
        const withCapacity = routeScope === 'POSTMAN';
        return {
            ma_bcvh: group.ma_bcvh,
            ten_bcvh: BCVH_NAMES[group.ma_bcvh] ?? null,
            ma_tuyen: group.ma_tuyen,
            ten_tuyen: tenTuyen,
            route_scope: routeScope,
            state: withCapacity ? (capacity === null ? STATES.CHUA_DU_DU_LIEU : 'CO_NANG_LUC') : STATES.KHONG_AP_DUNG,
            capacity: round(capacity, 1),
            days: summary.days,
            volume: summary.volume,
            volume_avg: round(summary.volume_avg, 1),
            load_avg: round(summary.load_avg, 3),
            days_over: summary.days_over,
            days_normal: summary.days_normal,
            days_under: summary.days_under,
            days_no_data: summary.days_no_data,
            postmen_avg: round(summary.postmen_avg, 2),
            volume_per_postman_avg: round(summary.volume_per_postman_avg, 1),
            bcvh_avg_per_route: null,
            rate: summary.rate,
        };
    }

    /** GET /capacity/route-days?ma_tuyen=: each day of one route with volume, rate, capacity of that day, load, band and postmen. */
    async routeDays(query = {}, scope = {}) {
        const period = resolvePeriod(query);
        const maTuyen = query.ma_tuyen !== undefined ? String(query.ma_tuyen) : '';
        if (!maTuyen || maTuyen.startsWith('@')) throw fail('MISSING_PARAM', 'Yêu cầu ma_tuyen của một tuyến có bưu tá');
        const scopeClause = this._scopeClause(scope, query);
        const historyFrom = shiftDate(period.from, -this.config.CAPACITY_WINDOW_DAYS);
        const rows = await this._postmanDays(historyFrom, period.to, scopeClause, { sql: ' AND ma_tuyen = ?', params: [maTuyen] });
        const groups = [...this._group(rows).values()];
        if (groups.length > 1) throw fail('INVALID_FILTER', 'ma_tuyen thuộc nhiều BCVH, cần chọn bcvh');
        const names = await this._routeNames(period.from, period.to, { sql: scopeClause.sql + ' AND ma_tuyen = ?', params: [...scopeClause.params, maTuyen] });
        const group = groups[0];
        const days = group ? routeDays(group.history, period.from, period.to, this.config) : [];
        return {
            route: group ? { ma_bcvh: group.ma_bcvh, ten_bcvh: BCVH_NAMES[group.ma_bcvh] ?? null, ma_tuyen: maTuyen, ten_tuyen: names.get(routeKeyOf(group.ma_bcvh, maTuyen)) ?? null, route_scope: 'POSTMAN' } : { ma_tuyen: maTuyen },
            days: days.map((day) => ({
                ...day,
                capacity: round(day.capacity, 1),
                load: round(day.load, 3),
                volume_per_postman: round(day.volume_per_postman, 1),
            })),
            meta: { period: { kind: period.kind, from: period.from, to: period.to, days: period.days }, config: { ...this.config } },
        };
    }
}

module.exports = { RouteCapacityService };

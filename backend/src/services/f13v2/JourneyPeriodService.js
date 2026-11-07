'use strict';

// F13-JOURNEY-ROUTE-02 B1: the journey routes and parcels over a PERIOD (Ngày / Tuần / Tháng), with the failed and the passed hours side by side,
// the cause of the failed parcels and the postmen of the period.
//
// It composes JourneyService day by day (JourneyService.js is a version file of the cause classifier: this ticket does not touch it, so the
// built days of the cause table are not made stale by it). Nothing is recomputed from the rules:
//   - the legs are the legs of JourneyService (tms_arrive already uses A_eff for a direct-handover BCVH);
//   - route_scope is routeScopeOf of the cause table builder, the route key is the one of /why/routes (POSTMAN: the route code, the other two:
//     one group per BCVH, '@NON_POSTMAN' / '@OTHER');
//   - own_shortfall is metricsOf of CauseAggQueryService from the same counters (9 N - 10 Đạt, never below 0);
//   - the cause mix of a route is read through CauseAggQueryService.routes() with the same period and scope as /why, so the numbers match.
// Performance: a period shares ONE read of F4.1 / F4.2 / F1.1 / BatchFile / lot scans for the whole window (RangeRepository) instead of
// one read per day; each day is then reduced to small aggregates before the next one is built.

const { JourneyService, median, shiftIsoDate } = require('./JourneyService');
const { isRealDate } = require('./periodResolve');
const { routeScopeOf } = require('./CauseAggBuilder');
const { resolvePeriod, metricsOf, labelOfLine, ROUTE_SCOPES } = require('./CauseAggQueryService');
const { DAYS_BEFORE, DAYS_AFTER, BF_EXTRA_DAYS } = require('./JourneyService');

const MAX_DAYS = 93; // a technical guard for the Hành trình pages (a quarter); not a business rule
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const FAILED = 'Không đạt';
const PASSED = 'Đạt';
const LEGS = ['tms_depart', 'depart_arrive', 'tms_arrive', 'arrive_gbt', 'gbt_ptc', 'tms_ptc'];
const STAGE_LEGS = ['tms_arrive', 'arrive_gbt', 'gbt_ptc']; // the three stages the slowest leg is picked from
const SCOPE_ORDER = { POSTMAN: 0, NON_POSTMAN: 1, OTHER: 2 };
const NON_POSTMAN_LABEL = 'Phát tại quầy (khách đến nhận)';
const OTHER_LABEL = 'Tuyến chưa xác định';
const TEXT_SORT_FIELDS = new Set(['ma_bg', 'ten_tuyen', 'ten_bcvh', 'ten_buu_ta', 'danh_gia', 'ma_lo', 'ngay_do_kiem']);

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
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

function daysOf(period) {
    const days = [];
    for (let day = period.from; day <= period.to; day = shiftIsoDate(day, 1)) days.push(day);
    return days;
}

/**
 * Reads the sources once for the whole window of a period and serves JourneyService's per-day reads from memory.
 * F4.1 / F4.2 rows carry their measurement day and are served by the window asked; the F1.1 bags, the BatchFile rows and the lot scans have no
 * day in the repository answer and are served for the whole window (a lot is one lot: its batches are counted over the wider window).
 */
class RangeRepository {
    constructor(base) {
        this.base = base;
        this.f41 = new Map();
        this.f42 = new Map();
    }

    async load(period) {
        const from = shiftIsoDate(period.from, -DAYS_BEFORE);
        const to = shiftIsoDate(period.to, DAYS_AFTER);
        const [f41, f42, f11, bf, scans] = await Promise.all([
            this.base.getF41Arrivals(from, to),
            this.base.getF42Handovers(from, to),
            this.base.getF11Departures(from, to),
            this.base.getBfLots(from, shiftIsoDate(to, BF_EXTRA_DAYS)),
            this.base.getF13LotScans(from, to),
        ]);
        const byDay = (rows) => {
            const map = new Map();
            for (const row of rows) {
                const list = map.get(row.ngay_do_kiem);
                if (list) list.push(row);
                else map.set(row.ngay_do_kiem, [row]);
            }
            return map;
        };
        this.f41 = byDay(f41);
        this.f42 = byDay(f42);
        this.f11 = f11;
        this.bf = bf;
        this.scans = scans;
        return this;
    }

    _window(map, from, to) {
        const rows = [];
        for (let day = from; day <= to; day = shiftIsoDate(day, 1)) {
            const list = map.get(day);
            if (list) rows.push(...list);
        }
        return rows;
    }

    getF13Parcels(date) { return this.base.getF13Parcels(date); }
    async getF41Arrivals(from, to) { return this._window(this.f41, from, to); }
    async getF42Handovers(from, to) { return this._window(this.f42, from, to); }
    async getF11Departures() { return this.f11; }
    async getBfLots() { return this.bf; }
    async getF13LotScans() { return this.scans; }
}

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

/** The stage among tms_arrive / arrive_gbt / gbt_ptc with the largest (failed median - passed median); null when none has both. */
function slowestLegOf(legsFailed, legsPassed) {
    let best = null;
    let bestGap = null;
    for (const leg of STAGE_LEGS) {
        const failedValue = legsFailed[leg];
        const passedValue = legsPassed[leg];
        if (failedValue === null || passedValue === null) continue;
        const gap = failedValue - passedValue;
        if (bestGap === null || gap > bestGap) { best = leg; bestGap = gap; }
    }
    return best;
}

const routeKeyOf = (scope, maTuyen) => (scope === 'POSTMAN' ? String(maTuyen ?? '') : `@${scope}`);

class JourneyPeriodService {
    /** @param {{repository, causeAgg?: CauseAggQueryService}} options causeAgg is optional: without it the cause fields stay null */
    constructor({ repository, causeAgg = null } = {}) {
        if (!repository) throw new Error('JourneyPeriodService needs a repository');
        this.repository = repository;
        this.causeAgg = causeAgg;
    }

    /** Builds each day of the period (shared reads) and hands its items to `visit(items, day)`. */
    async _eachDay(period, scope, visit) {
        const range = await new RangeRepository(this.repository).load(period);
        const inner = new JourneyService({ repository: range });
        for (const day of daysOf(period)) {
            const items = await inner._parcels(day, scope);
            for (const item of items) {
                item.ngay_do_kiem = day;
                item.route_scope = routeScopeOf(item.ma_tuyen);
            }
            visit(items, day);
        }
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
        const groups = new Map();
        const coverage = { parcels: 0, tms: 0, depart: 0, arrive: 0, gbt: 0, ptc: 0 };
        const lots = { failed: 0, failed_in_lot: 0, khong_tron_lo: 0 };
        const lotCodes = new Set();
        await this._eachDay(period, scope, (items) => {
            for (const item of items) {
                coverage.parcels += 1;
                for (const key of ['tms', 'depart', 'arrive', 'gbt', 'ptc']) if (item.milestones[key] !== null) coverage[key] += 1;
                const failed = item.danh_gia === FAILED;
                if (failed) {
                    lots.failed += 1;
                    if (item.ma_lo) lots.failed_in_lot += 1;
                    if (item.khong_tron_lo) { lots.khong_tron_lo += 1; lotCodes.add(item.ma_lo); }
                }
                const key = `${item.ma_bcvh}|${routeKeyOf(item.route_scope, item.ma_tuyen)}`;
                let group = groups.get(key);
                if (!group) {
                    group = {
                        key, ma_bcvh: String(item.ma_bcvh), ten_bcvh: item.ten_bcvh, route_scope: item.route_scope, route_key: routeKeyOf(item.route_scope, item.ma_tuyen),
                        ma_tuyen: item.route_scope === 'POSTMAN' ? item.ma_tuyen : null, ten_tuyen: item.route_scope === 'POSTMAN' ? item.ten_tuyen : null,
                        volume: 0, passed: 0, failed: 0, khong_tron_lo: 0, postmen: new Map(),
                        all: Object.fromEntries(LEGS.map((leg) => [leg, []])), legsFailed: Object.fromEntries(LEGS.map((leg) => [leg, []])), legsPassed: Object.fromEntries(LEGS.map((leg) => [leg, []])),
                    };
                    groups.set(key, group);
                }
                if (group.ten_tuyen === null && item.route_scope === 'POSTMAN' && item.ten_tuyen) group.ten_tuyen = item.ten_tuyen;
                group.volume += 1;
                if (item.danh_gia === PASSED) group.passed += 1;
                if (failed) group.failed += 1;
                if (item.khong_tron_lo) group.khong_tron_lo += 1;
                if (item.ten_buu_ta || item.ma_buu_ta) {
                    const postmanKey = item.ma_buu_ta || item.ten_buu_ta;
                    const entry = group.postmen.get(postmanKey) || { ma_buu_ta: item.ma_buu_ta, ten_buu_ta: item.ten_buu_ta, volume: 0 };
                    entry.volume += 1;
                    group.postmen.set(postmanKey, entry);
                }
                for (const leg of LEGS) {
                    const value = item.legs[leg];
                    if (value === null) continue;
                    group.all[leg].push(value);
                    if (failed) group.legsFailed[leg].push(value);
                    else if (item.danh_gia === PASSED) group.legsPassed[leg].push(value);
                }
            }
        });

        const cause = await this._causeRows(period, scope);
        const medians = (lists) => Object.fromEntries(LEGS.map((leg) => [leg, median(lists[leg])]));
        let volumeMismatch = 0;
        const routes = [...groups.values()].map((group) => {
            const metrics = metricsOf({ n: group.volume, passed: group.passed, failed: group.failed, unrated: group.volume - group.passed - group.failed, distinct: group.volume });
            const causeRow = cause.rows.get(group.key) || null;
            if (causeRow && causeRow.volume !== group.volume) volumeMismatch += 1;
            const legsFailed = medians(group.legsFailed);
            const legsPassed = medians(group.legsPassed);
            const isPostman = group.route_scope === 'POSTMAN';
            return {
                key: group.key,
                ma_bcvh: group.ma_bcvh,
                ten_bcvh: group.ten_bcvh,
                route_scope: group.route_scope,
                ma_tuyen: group.ma_tuyen,
                ten_tuyen: isPostman ? group.ten_tuyen : (group.route_scope === 'NON_POSTMAN' ? NON_POSTMAN_LABEL : OTHER_LABEL),
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
                legs: medians(group.all),
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
                cause_layer: { ...cause.meta, volume_mismatch_routes: volumeMismatch },
            },
        };
    }

    async getParcels(query, { route = null, search = null, onlyKhongTronLo = false, sort = 'tms_ptc', order = 'desc', page = 1, pageSize = DEFAULT_PAGE_SIZE, ...scope } = {}) {
        const period = resolveJourneyPeriod(query);
        const needle = search ? String(search).trim().toUpperCase() : '';
        const routeText = route ? String(route) : null;
        if (routeText && routeText.startsWith('@') && !ROUTE_SCOPES.includes(routeText.slice(1))) throw fail('INVALID_FILTER', 'route không hợp lệ');
        const keep = (parcel) => (!routeText || (routeText.startsWith('@') ? parcel.route_scope === routeText.slice(1) : parcel.ma_tuyen === routeText))
            && (!onlyKhongTronLo || parcel.khong_tron_lo)
            && (!needle || parcel.ma_bg.toUpperCase().includes(needle) || (parcel.ma_lo || '').toUpperCase().includes(needle));
        const kept = [];
        await this._eachDay(period, scope, (items) => { for (const item of items) if (keep(item)) kept.push(item); });

        const direction = order === 'asc' ? 1 : -1;
        const valueOf = (parcel) => {
            if (LEGS.includes(sort)) return parcel.legs[sort];
            if (TEXT_SORT_FIELDS.has(sort)) return parcel[sort];
            return parcel.milestones[sort] ?? null;
        };
        const sorted = kept
            .map((parcel, index) => ({ parcel, index, value: valueOf(parcel) }))
            .sort((a, b) => {
                if (a.value === null || a.value === undefined) return b.value === null || b.value === undefined ? a.index - b.index : 1;
                if (b.value === null || b.value === undefined) return -1;
                const compared = typeof a.value === 'number' ? a.value - b.value : String(a.value).localeCompare(String(b.value), 'vi');
                return compared * direction || a.index - b.index;
            })
            .map((item) => item.parcel);

        const size = Math.min(Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(sorted.length / size));
        const current = Math.min(Math.max(Number(page) || 1, 1), totalPages);
        return {
            parcels: sorted.slice((current - 1) * size, current * size),
            meta: { date: period.from === period.to ? period.from : null, period, total: sorted.length, page: current, page_size: size, total_pages: totalPages },
        };
    }
}

module.exports = { JourneyPeriodService, RangeRepository, resolveJourneyPeriod, mainCauseOf, slowestLegOf, routeKeyOf, MAX_DAYS, LEGS, STAGE_LEGS };

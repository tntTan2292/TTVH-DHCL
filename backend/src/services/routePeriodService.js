// F13-ROUTE-RANKING-PERIOD-01 Phase B1 — new service (additive-only; does not touch
// F13DashboardService.js or any other existing service). Orchestrates the four fixed queries
// (Q1 anchor date, Q2 daily facts, Q3 previous-month, Q4 reconciliation) behind
// `GET /f13/ranking/route/periods` per the Design of Record Revision R1.
//
// Field-level rules this file must hold exactly (Design of Record references):
//   - §3.2 M-01: volume is a measurement-instance count (COUNT(ma_bg)), never de-duplicated.
//   - §3.2 M-03 / §6.4 C-04: rate = null if and only if volume = 0. Never render/derive 0.
//   - §4.4 T-01: the route set is the union over the month-to-anchor window, not the anchor
//     day's set — a route absent on anchor day still appears, with day.rate = null.
//   - §4.2.1: "Cùng kỳ tháng trước" reuses BCVH Ranking's own same-elapsed-days MTD formula
//     verbatim (implemented in the repository, not here — this file only consumes its output).
//   - §6.4 C-02: month is a Node-side roll-up of the very daily facts returned by Q2, never a
//     separate GROUP BY month query — so "month total disagrees with the days shown" is
//     structurally impossible, not merely tested.
//   - §5.2 AC-05: reconciliation identity bcvh_total = ranked + pickup_at_office + non_hue +
//     no_route must hold for both periods; identity_ok surfaces a runtime check, not a silent
//     assumption.
//   - §3.3 / AC-08: `rank` (by month.rate) is assigned to every route, including rate = null
//     ones (tied last) — never left blank.

const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const { all: defaultAll } = require('../config/db');
const { CONFIRMED_NON_POSTMAN_ROUTES } = require('../config/f13RouteClassificationCatalog');

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CONFIRMED_NON_POSTMAN_ROUTE_CODES = CONFIRMED_NON_POSTMAN_ROUTES.map((route) => route.ma_tuyen);

function isValidIsoDate(value) {
    return typeof value === 'string' && ISO_DATE_RE.test(value);
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

// §3.2 M-03 / C-04: null exactly when volume = 0, never a fabricated 0%.
function nullableRate(passed, volume) {
    const denominator = Number(volume || 0);
    if (denominator <= 0) return null;
    return Number(((Number(passed || 0) / denominator) * 100).toFixed(4));
}

// RANK()-style ranking: every entry receives a rank, including rate = null ones (tied last,
// per §3.3/AC-08 — "Tuyến có rate = null xếp cuối, hạng vẫn cấp, không bỏ trống"). Ties share a
// rank; the next distinct value's rank skips accordingly — the same convention
// getBcvhRanking()'s SQL RANK() OVER(...) already uses, just computed in JS because ranking here
// spans two Node-side roll-ups (month and previous_month), not a single SQL aggregate.
function rankByField(entries, field, rankKey) {
    const sorted = [...entries].sort((a, b) => {
        const ra = a[field].rate;
        const rb = b[field].rate;
        if (ra === null && rb === null) return 0;
        if (ra === null) return 1;
        if (rb === null) return -1;
        if (rb !== ra) return rb - ra;
        return b[field].volume - a[field].volume;
    });
    let previousKey = null;
    let previousRank = null;
    sorted.forEach((entry, index) => {
        const key = `${entry[field].rate}|${entry[field].volume}`;
        if (key !== previousKey) previousRank = index + 1;
        entry[rankKey] = previousRank;
        previousKey = key;
    });
    return entries;
}

// Calendar day count between two ISO dates, inclusive on both ends. Pure date-only arithmetic
// (no time-of-day component), so it is not subject to timezone/DST ambiguity, and matches the
// SQL-computed previousStart/previousEnd exactly since both are plain 'YYYY-MM-DD' calendar
// dates with no wall-clock component.
function inclusiveDayCount(startIso, endIso) {
    if (!startIso || !endIso) return 0;
    const start = new Date(`${startIso}T00:00:00Z`);
    const end = new Date(`${endIso}T00:00:00Z`);
    return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function emptyReconciliationBucket() {
    return { bcvh_total: 0, ranked: 0, pickup_at_office: 0, non_hue: 0, no_route: 0, identity_ok: true };
}

class RoutePeriodService {
    // `repository` and `queryAnchor` are injectable so tests can exercise the full roll-up /
    // ranking / reconciliation logic against canned data without touching any real database —
    // `queryAnchor` stands in for Q1, which (per the Phase B1 file scope — exactly 3 new
    // repository methods) is issued directly via config/db's `all()` promise wrapper rather
    // than a fourth repository method.
    constructor({ repository = factBuuGuiRepo, queryAnchor = null } = {}) {
        this.repository = repository;
        this.queryAnchor = queryAnchor || ((bcvh, anchorCeiling) => defaultAll(
            `SELECT MAX(ngay_do_kiem) as anchor_date, MAX(ten_bcvh) as ten_bcvh
             FROM fact_f13
             WHERE ma_bcvh = ? AND date(ngay_do_kiem) <= COALESCE(date(?), date('now', 'localtime'))`,
            [bcvh, anchorCeiling]
        ));
    }

    _normalizeRouteType(routeType) {
        return routeType === 'all' ? 'all' : 'postman';
    }

    _emptyPayload(bcvh) {
        return {
            anchor_date: null,
            bcvh: { ma_bcvh: bcvh, ten_bcvh: null },
            periods: {
                day: { start: null, end: null },
                month_to_anchor: { start: null, end: null, days_in_period: 0 },
                previous_month: { start: null, end: null, days_in_period: 0 },
            },
            routes: [],
            reconciliation: {
                day: emptyReconciliationBucket(),
                month: emptyReconciliationBucket(),
            },
        };
    }

    _buildReconciliationBucket(row, prefix) {
        const bcvh_total = Number(row?.[`${prefix}_bcvh_total`] || 0);
        const ranked = Number(row?.[`${prefix}_ranked`] || 0);
        const pickup_at_office = Number(row?.[`${prefix}_pickup_at_office`] || 0);
        const non_hue = Number(row?.[`${prefix}_non_hue`] || 0);
        const no_route = Number(row?.[`${prefix}_no_route`] || 0);
        return {
            bcvh_total,
            ranked,
            pickup_at_office,
            non_hue,
            no_route,
            identity_ok: bcvh_total === ranked + pickup_at_office + non_hue + no_route,
        };
    }

    async getRoutePeriods(bcvh, requestedAnchorDate, options = {}) {
        if (requestedAnchorDate !== undefined && requestedAnchorDate !== null && requestedAnchorDate !== '' && !isValidIsoDate(requestedAnchorDate)) {
            const error = new Error('anchor_date must be a valid ISO date in YYYY-MM-DD format');
            error.code = 'INVALID_DATE';
            throw error;
        }
        const routeType = this._normalizeRouteType(options.routeType);
        // §4.1: anchor_ceiling defaults to today when the client omits anchor_date — identical
        // in effect to capping at meta.max_date (the global MAX(ngay_do_kiem) <= today), since
        // no single BCVH can hold data beyond the system-wide max date. COALESCE(date(?), ...)
        // in the SQL handles the null case, so this never issues a second lookup query.
        const anchorCeiling = isValidIsoDate(requestedAnchorDate) ? requestedAnchorDate : null;

        // Q1.
        const anchorRows = await this.queryAnchor(bcvh, anchorCeiling);
        const anchorDate = anchorRows?.[0]?.anchor_date || null;
        if (!anchorDate) {
            // §4.1: no fallback to another BCVH or another date — an explicit empty state.
            return this._emptyPayload(bcvh);
        }
        const tenBcvh = anchorRows[0]?.ten_bcvh || null;
        const monthStart = `${anchorDate.slice(0, 7)}-01`;
        const monthDaysElapsed = Number(anchorDate.slice(8, 10));

        const repoOptions = { routeType, confirmedNonPostmanRouteCodes: CONFIRMED_NON_POSTMAN_ROUTE_CODES };
        const [dailyFacts, previousMonth, reconciliationRow] = await Promise.all([
            this.repository.getRoutePeriodDailyFacts(bcvh, monthStart, anchorDate, repoOptions),
            this.repository.getRoutePeriodPreviousMonth(bcvh, anchorDate, repoOptions),
            this.repository.getRouteScopeReconciliation(bcvh, anchorDate, monthStart, anchorDate, CONFIRMED_NON_POSTMAN_ROUTE_CODES),
        ]);

        // T-01: the route set is the union over the month-to-anchor window (every ma_tuyen that
        // appears anywhere in `dailyFacts`), never the anchor-day-only set.
        const byRoute = new Map();
        (dailyFacts || []).forEach((row) => {
            const ma_tuyen = row.ma_tuyen;
            if (!byRoute.has(ma_tuyen)) {
                byRoute.set(ma_tuyen, {
                    ma_tuyen,
                    ten_tuyen: row.ten_tuyen || null,
                    loai_tuyen_phat: row.loai_tuyen_phat || null,
                    days: [],
                });
            }
            const entry = byRoute.get(ma_tuyen);
            if (!entry.ten_tuyen && row.ten_tuyen) entry.ten_tuyen = row.ten_tuyen;
            if (!entry.loai_tuyen_phat && row.loai_tuyen_phat) entry.loai_tuyen_phat = row.loai_tuyen_phat;
            entry.days.push({
                date: row.date,
                volume: Number(row.volume || 0),
                passed: Number(row.passed || 0),
                failed: Number(row.failed || 0),
            });
        });

        const previousByRoute = new Map((previousMonth?.routes || []).map((row) => [row.ma_tuyen, row]));
        const previousStart = previousMonth?.previousStart || null;
        const previousEnd = previousMonth?.previousEnd || null;
        const previousDaysInPeriod = inclusiveDayCount(previousStart, previousEnd);

        const routes = Array.from(byRoute.values()).map((entry) => {
            entry.days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

            // C-02: month is a Node-side sum of the very daily facts returned by Q2 — no
            // separate GROUP BY month query exists anywhere in this file.
            const monthVolume = entry.days.reduce((sum, d) => sum + d.volume, 0);
            const monthPassed = entry.days.reduce((sum, d) => sum + d.passed, 0);
            const monthFailed = entry.days.reduce((sum, d) => sum + d.failed, 0);

            // C-03: day is extracted from the same daily facts, never queried separately.
            const dayRow = entry.days.find((d) => d.date === anchorDate) || null;
            const day = dayRow
                ? { volume: dayRow.volume, passed: dayRow.passed, failed: dayRow.failed, rate: nullableRate(dayRow.passed, dayRow.volume) }
                : { volume: 0, passed: 0, failed: 0, rate: null };

            const previousRow = previousByRoute.get(entry.ma_tuyen) || null;
            const previousVolume = Number(previousRow?.volume || 0);
            const previousPassed = Number(previousRow?.passed || 0);
            const previousFailed = Number(previousRow?.failed || 0);
            const previous_month = {
                volume: previousVolume,
                passed: previousPassed,
                failed: previousFailed,
                rate: nullableRate(previousPassed, previousVolume),
                days_with_data: Number(previousRow?.days_with_data || 0),
                days_in_period: previousDaysInPeriod,
            };

            const month = {
                volume: monthVolume,
                passed: monthPassed,
                failed: monthFailed,
                rate: nullableRate(monthPassed, monthVolume),
                days_with_data: entry.days.length,
                days_in_period: monthDaysElapsed,
            };

            const delta = (month.rate !== null && previous_month.rate !== null)
                ? round2(month.rate - previous_month.rate)
                : null;

            return {
                ma_tuyen: entry.ma_tuyen,
                ten_tuyen: entry.ten_tuyen,
                loai_tuyen_phat: entry.loai_tuyen_phat,
                day,
                month,
                previous_month,
                delta,
                daily_series: entry.days.map((d) => ({
                    date: d.date,
                    volume: d.volume,
                    passed: d.passed,
                    rate: nullableRate(d.passed, d.volume),
                })),
            };
        });

        // AC-08: every route gets a rank, including rate = null ones (tied last).
        rankByField(routes, 'month', 'rank');
        rankByField(routes, 'previous_month', 'rank_previous_month');
        routes.forEach((route) => {
            // §3.3: "Biến động hạng ... null nếu tuyến không có mặt trong cửa sổ cùng kỳ tháng
            // trước" — rank_previous_month itself is still a real (tied-last) number so a route
            // can show "was #28", but the delta is null whenever there was no real previous
            // window data to compare against.
            route.rank_delta = route.previous_month.rate !== null
                ? route.rank_previous_month - route.rank
                : null;
        });

        return {
            anchor_date: anchorDate,
            bcvh: { ma_bcvh: bcvh, ten_bcvh: tenBcvh },
            periods: {
                day: { start: anchorDate, end: anchorDate },
                month_to_anchor: { start: monthStart, end: anchorDate, days_in_period: monthDaysElapsed },
                previous_month: { start: previousStart, end: previousEnd, days_in_period: previousDaysInPeriod },
            },
            routes,
            reconciliation: {
                day: this._buildReconciliationBucket(reconciliationRow, 'day'),
                month: this._buildReconciliationBucket(reconciliationRow, 'month'),
            },
        };
    }
}

module.exports = {
    RoutePeriodService,
    routePeriodService: new RoutePeriodService(),
    nullableRate,
    rankByField,
    inclusiveDayCount,
};
